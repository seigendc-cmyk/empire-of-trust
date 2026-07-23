import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import JSZip from 'jszip';
import {
  applyDatabaseMigrations,
  createLocalDatabaseBackup,
  DATABASE_SCHEMA_VERSION,
  databaseMigrations,
  exportLocalDatabaseBackup,
  getDatabaseStartupStatus,
  getDatabaseUserVersion,
  getSQLiteDB,
  restoreLocalDatabaseBackup,
  setSQLiteDatabaseForTesting,
  SQLITE_BACKUP_FORMAT_VERSION,
  SQLITE_BACKUP_PRODUCT_NAME,
  SQLITE_STORAGE_KEYS,
  validateLocalDatabaseBackup,
} from '../lib/sqlite';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const wasmBinary = readFileSync(join(testDirectory, '../../node_modules/sql.js/dist/sql-wasm.wasm'));

let SQL: SqlJsStatic;
let indexedDBStores: Map<string, Map<IDBValidKey, unknown>>;

const originalCrypto = globalThis.crypto;
const originalFetch = globalThis.fetch;
const originalIndexedDB = globalThis.indexedDB;

beforeAll(async () => {
  SQL = await initSqlJs({ wasmBinary });
});

function createDatabase(): Database {
  return new SQL.Database();
}

function firstValue(db: Database, sql: string): unknown {
  return db.exec(sql)[0]?.values[0]?.[0];
}

function createRequest<T>(operation: () => T): IDBRequest<T> {
  const request = {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
  } as unknown as IDBRequest<T>;

  queueMicrotask(() => {
    try {
      Object.defineProperty(request, 'result', { configurable: true, value: operation() });
      request.onsuccess?.({ target: request } as unknown as Event);
    } catch (error) {
      Object.defineProperty(request, 'error', { configurable: true, value: error });
      request.onerror?.({ target: request } as unknown as Event);
    }
  });
  return request;
}

function installIndexedDBMock(): void {
  indexedDBStores = new Map();
  const database = {
    objectStoreNames: {
      contains: (name: string) => indexedDBStores.has(name),
    },
    createObjectStore: (name: string) => {
      indexedDBStores.set(name, new Map());
      return {};
    },
    transaction: (storeName: string) => ({
      objectStore: () => ({
        get: (key: IDBValidKey) => createRequest(() => indexedDBStores.get(storeName)?.get(key)),
        put: (value: unknown, key: IDBValidKey) => createRequest(() => {
          const store = indexedDBStores.get(storeName);
          if (!store) throw new Error(`Object store ${storeName} does not exist.`);
          store.set(key, value);
          return key;
        }),
      }),
    }),
  } as unknown as IDBDatabase;

  globalThis.indexedDB = {
    open: () => {
      const request = {
        result: database,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      } as unknown as IDBOpenDBRequest;
      queueMicrotask(() => {
        request.onupgradeneeded?.({ target: request } as unknown as IDBVersionChangeEvent);
        request.onsuccess?.({ target: request } as unknown as Event);
      });
      return request;
    },
  } as unknown as IDBFactory;
}

async function createCustomBackup(
  manifestOverrides: Record<string, unknown> = {},
  databaseBytes = new Uint8Array([1, 2, 3])
): Promise<Blob> {
  const digest = await webcrypto.subtle.digest('SHA-256', databaseBytes);
  const sha256Checksum = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('');
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({
    productName: SQLITE_BACKUP_PRODUCT_NAME,
    backupFormatVersion: SQLITE_BACKUP_FORMAT_VERSION,
    applicationVersion: 'test-version',
    createdAt: new Date().toISOString(),
    databaseByteLength: databaseBytes.byteLength,
    sha256Checksum,
    ...manifestOverrides,
  }));
  zip.file('database.sqlite', databaseBytes);
  return zip.generateAsync({ type: 'blob' });
}

beforeEach(() => {
  installIndexedDBMock();
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
  const wasmArrayBuffer = wasmBinary.buffer.slice(
    wasmBinary.byteOffset,
    wasmBinary.byteOffset + wasmBinary.byteLength
  ) as ArrayBuffer;
  globalThis.fetch = async () => new Response(wasmArrayBuffer, { status: 200 });
  setSQLiteDatabaseForTesting(null);
});

afterEach(() => {
  setSQLiteDatabaseForTesting(null);
  globalThis.fetch = originalFetch;
  globalThis.indexedDB = originalIndexedDB;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
});

describe('SQLite database migrations', () => {
  it('initializes a fresh database with the complete schema', () => {
    const db = createDatabase();

    applyDatabaseMigrations(db);

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table';")[0].values.flat();
    expect(tables).toEqual(expect.arrayContaining([
      'local_books',
      'local_chapters',
      'local_content_blocks',
      'local_references',
      'reader_library',
      'reader_bookmarks',
      'reader_highlights',
      'reader_quiz_attempts',
    ]));

    const columns = db.exec('PRAGMA table_info(local_books);')[0].values.map((row) => row[1]);
    expect(columns).toEqual(expect.arrayContaining([
      'category',
      'numbering_config_json',
      'assets_json',
      'is_archived',
      'access_codes_json',
    ]));
  });

  it('migrates an older user_version without losing existing data', () => {
    const db = createDatabase();
    databaseMigrations[0].up(db);
    db.run("ALTER TABLE local_books ADD COLUMN category TEXT DEFAULT 'General';");
    db.run("INSERT INTO local_books (id, title, author) VALUES ('legacy', 'Legacy book', 'Legacy author');");
    expect(getDatabaseUserVersion(db)).toBe(0);

    applyDatabaseMigrations(db);

    expect(firstValue(db, "SELECT title FROM local_books WHERE id = 'legacy';")).toBe('Legacy book');
    expect(getDatabaseUserVersion(db)).toBe(DATABASE_SCHEMA_VERSION);
    const columns = db.exec('PRAGMA table_info(local_books);')[0].values.map((row) => row[1]);
    expect(columns).toContain('category');
    expect(columns).toContain('access_codes_json');
  });

  it('can be initialized repeatedly without rerunning completed migrations', () => {
    const db = createDatabase();
    applyDatabaseMigrations(db);
    db.run("INSERT INTO local_books (id, title, author) VALUES ('kept', 'Kept book', 'Author');");

    applyDatabaseMigrations(db);

    expect(firstValue(db, "SELECT COUNT(*) FROM local_books WHERE id = 'kept';")).toBe(1);
    expect(getDatabaseUserVersion(db)).toBe(DATABASE_SCHEMA_VERSION);
  });

  it('rolls back a failed migration and leaves user_version unchanged', () => {
    const db = createDatabase();

    expect(() => applyDatabaseMigrations(db, [{
      version: 1,
      name: 'intentional_failure',
      up: (migrationDb) => {
        migrationDb.run('CREATE TABLE should_be_rolled_back (id TEXT);');
        throw new Error('intentional test failure');
      },
    }])).toThrow(/migration 1 \(intentional_failure\) failed: intentional test failure/i);

    expect(getDatabaseUserVersion(db)).toBe(0);
    expect(firstValue(
      db,
      "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'should_be_rolled_back';"
    )).toBe(0);
  });

  it('sets the final user_version to the latest migration version', () => {
    const db = createDatabase();

    applyDatabaseMigrations(db);

    expect(getDatabaseUserVersion(db)).toBe(databaseMigrations.at(-1)?.version);
    expect(getDatabaseUserVersion(db)).toBe(DATABASE_SCHEMA_VERSION);
  });
});

describe('SQLite backup and restore', () => {
  it('exports a valid ZIP backup with the required manifest and database files', async () => {
    const db = createDatabase();
    applyDatabaseMigrations(db);
    db.run("INSERT INTO local_books (id, title, author) VALUES ('backup', 'Backup book', 'Author');");
    setSQLiteDatabaseForTesting(db);

    const backup = await exportLocalDatabaseBackup();
    const validation = await validateLocalDatabaseBackup(backup);
    const zip = await JSZip.loadAsync(backup);

    expect(zip.file('manifest.json')).not.toBeNull();
    expect(zip.file('database.sqlite')).not.toBeNull();
    expect(validation.valid).toBe(true);
    expect(validation.manifest).toMatchObject({
      productName: SQLITE_BACKUP_PRODUCT_NAME,
      backupFormatVersion: SQLITE_BACKUP_FORMAT_VERSION,
      applicationVersion: '0.1.0-alpha.1',
      databaseByteLength: validation.databaseBytes?.byteLength,
    });
    expect(validation.manifest?.createdAt).toBeTruthy();
    expect(validation.manifest?.sha256Checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('restores a valid backup after creating an emergency backup', async () => {
    const current = createDatabase();
    applyDatabaseMigrations(current);
    current.run("INSERT INTO local_books (id, title, author) VALUES ('current', 'Current book', 'Author');");
    setSQLiteDatabaseForTesting(current);

    const incoming = createDatabase();
    applyDatabaseMigrations(incoming);
    incoming.run("INSERT INTO local_books (id, title, author) VALUES ('incoming', 'Incoming book', 'Author');");

    const result = await restoreLocalDatabaseBackup(await createLocalDatabaseBackup(incoming.export()));
    const restored = await getSQLiteDB();
    const emergencyBytes = indexedDBStores
      .get('sqlite_bytes')
      ?.get(SQLITE_STORAGE_KEYS.emergencyBackup) as Uint8Array;
    const emergency = new SQL.Database(emergencyBytes);

    expect(result).toMatchObject({ success: true, requiresReload: true });
    expect(getDatabaseStartupStatus()).toBe('restore-required');
    expect(firstValue(restored, "SELECT title FROM local_books WHERE id = 'incoming';")).toBe('Incoming book');
    expect(firstValue(emergency, "SELECT title FROM local_books WHERE id = 'current';")).toBe('Current book');
    expect(indexedDBStores.get('sqlite_bytes')?.get(SQLITE_STORAGE_KEYS.database)).toBeInstanceOf(Uint8Array);
  });

  it('rejects a checksum mismatch', async () => {
    const validation = await validateLocalDatabaseBackup(
      await createCustomBackup({ sha256Checksum: '0'.repeat(64) })
    );

    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/checksum/i);
  });

  it('rejects a malformed manifest', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', '{not-json');
    zip.file('database.sqlite', new Uint8Array([1, 2, 3]));

    const validation = await validateLocalDatabaseBackup(await zip.generateAsync({ type: 'blob' }));

    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/manifest\.json is malformed/i);
  });

  it('rejects a backup for the wrong product', async () => {
    const validation = await validateLocalDatabaseBackup(
      await createCustomBackup({ productName: 'another-product' })
    );

    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/productName/i);
  });

  it('rejects a database byte length mismatch', async () => {
    const validation = await validateLocalDatabaseBackup(
      await createCustomBackup({ databaseByteLength: 999 })
    );

    expect(validation.valid).toBe(false);
    expect(validation.error).toMatch(/byte length/i);
  });

  it('preserves the current database when restore validation fails', async () => {
    const current = createDatabase();
    applyDatabaseMigrations(current);
    current.run("INSERT INTO local_books (id, title, author) VALUES ('current', 'Still current', 'Author');");
    setSQLiteDatabaseForTesting(current);

    const result = await restoreLocalDatabaseBackup(await createCustomBackup());

    expect(result).toMatchObject({ success: false, requiresReload: false });
    expect(firstValue(await getSQLiteDB(), "SELECT title FROM local_books WHERE id = 'current';")).toBe('Still current');
    expect(indexedDBStores.get('sqlite_bytes')?.has(SQLITE_STORAGE_KEYS.database)).not.toBe(true);
  });
});

describe('SQLite corruption recovery', () => {
  it('preserves corrupt bytes under the recovery key before creating a replacement', async () => {
    const corruptBytes = new Uint8Array([1, 2, 3, 4, 5]);
    indexedDBStores.set('sqlite_bytes', new Map([
      [SQLITE_STORAGE_KEYS.database, corruptBytes],
    ]));

    const replacement = await getSQLiteDB();

    expect(getDatabaseStartupStatus()).toBe('recovered');
    expect(indexedDBStores.get('sqlite_bytes')?.get(SQLITE_STORAGE_KEYS.corruptionRecovery)).toEqual(corruptBytes);
    expect(getDatabaseUserVersion(replacement)).toBe(DATABASE_SCHEMA_VERSION);
  });
});
