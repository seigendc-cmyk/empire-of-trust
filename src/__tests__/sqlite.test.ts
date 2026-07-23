import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  applyDatabaseMigrations,
  DATABASE_SCHEMA_VERSION,
  databaseMigrations,
  getDatabaseUserVersion,
} from '../lib/sqlite';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const wasmBinary = readFileSync(join(testDirectory, '../../node_modules/sql.js/dist/sql-wasm.wasm'));

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs({ wasmBinary });
});

function createDatabase(): Database {
  return new SQL.Database();
}

function firstValue(db: Database, sql: string): unknown {
  return db.exec(sql)[0]?.values[0]?.[0];
}

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
