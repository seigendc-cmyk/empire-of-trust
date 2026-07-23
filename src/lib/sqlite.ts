import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import JSZip from 'jszip';
import { Book, Chapter, ContentBlock, ReferenceItem, ReaderLibraryItem, Bookmark, HighlightNote, QuizAttempt } from '../types';

const INDEXEDDB_NAME = 'BookPublisher_SQLite_DB';
const STORE_NAME = 'sqlite_bytes';
const DB_KEY = 'main_sqlite_file';
const DB_RECOVERY_KEY = 'corrupted_sqlite_recovery';
const EMERGENCY_BACKUP_KEY = 'emergency_backup_before_restore';

export const SQLITE_BACKUP_PRODUCT_NAME = 'empire-of-trust';
export const SQLITE_BACKUP_FORMAT_VERSION = '1.0.0';
export const SQLITE_APPLICATION_VERSION = '0.1.0-alpha.1';
export const SQLITE_STORAGE_KEYS = {
  database: DB_KEY,
  corruptionRecovery: DB_RECOVERY_KEY,
  emergencyBackup: EMERGENCY_BACKUP_KEY,
} as const;

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;
let sqlJsPromise: Promise<SqlJsStatic> | null = null;
let databaseStartupStatus: DatabaseStartupStatus = 'loaded';
export type SQLiteEngineInitializer = (
  config?: Parameters<typeof initSqlJs>[0]
) => Promise<SqlJsStatic>;
const defaultSqlJsInitializer: SQLiteEngineInitializer = (config) => initSqlJs(config);
let sqlJsInitializer: SQLiteEngineInitializer = defaultSqlJsInitializer;
let configuredSqlWasmUrl = sqlWasmUrl;
let initializationFailureReported = false;

export const SQL_WASM_URL = sqlWasmUrl;

export type SQLiteEngineStatus = 'idle' | 'initializing' | 'healthy' | 'unavailable';

export interface SQLiteEngineState {
  status: SQLiteEngineStatus;
  error: string | null;
  attempts: number;
  wasmUrl: string;
  sqliteVersion: string | null;
}

let sqliteEngineState: SQLiteEngineState = {
  status: 'idle',
  error: null,
  attempts: 0,
  wasmUrl: configuredSqlWasmUrl,
  sqliteVersion: null,
};
const sqliteEngineListeners = new Set<(state: SQLiteEngineState) => void>();

export interface DatabaseMigration {
  version: number;
  name: string;
  up: (db: Database) => void;
}

export type DatabaseStartupStatus =
  | 'loaded'
  | 'created'
  | 'recovered'
  | 'corrupted'
  | 'storage-unavailable'
  | 'restore-required';

export interface LocalDatabaseBackupManifest {
  productName: string;
  backupFormatVersion: string;
  applicationVersion: string;
  createdAt: string;
  databaseByteLength: number;
  sha256Checksum: string;
}

export interface LocalDatabaseBackupValidation {
  valid: boolean;
  manifest?: LocalDatabaseBackupManifest;
  databaseBytes?: Uint8Array;
  error?: string;
}

export interface LocalDatabaseRestoreResult {
  success: boolean;
  requiresReload: boolean;
  message: string;
}

export const DATABASE_SCHEMA_VERSION = 2;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Initialize IndexedDB persistence helper
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load SQLite DB bytes from IndexedDB
 */
async function loadDbFromIndexedDB(): Promise<Uint8Array | null> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(DB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveBytesToIndexedDB(key: string, bytes: Uint8Array): Promise<void> {
  const idb = await openIndexedDB();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(bytes, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Serialized persistence queue for IndexedDB writes.
 * Prevents older exports from overwriting newer ones and exposes write errors.
 */
let persistSeq = 0;
let lastPersist: Promise<void> = Promise.resolve();

export async function persistDbToIndexedDB(): Promise<void> {
  if (!dbInstance) return;

  const mySeq = ++persistSeq;

  const task = async (): Promise<void> => {
    if (mySeq !== persistSeq || !dbInstance) return;

    await saveBytesToIndexedDB(DB_KEY, dbInstance.export());
  };

  lastPersist = (async () => {
    try {
      await lastPersist;
    } catch {
      // Previous save failed, but continue with current task if still relevant
    }
    if (mySeq !== persistSeq || !dbInstance) return;
    return task();
  })();

  return lastPersist;
}

export function getDatabaseStartupStatus(): DatabaseStartupStatus {
  return databaseStartupStatus;
}

export function getSQLiteEngineState(): SQLiteEngineState {
  return { ...sqliteEngineState };
}

export function subscribeSQLiteEngineState(
  listener: (state: SQLiteEngineState) => void
): () => void {
  sqliteEngineListeners.add(listener);
  listener(getSQLiteEngineState());
  return () => sqliteEngineListeners.delete(listener);
}

function updateSQLiteEngineState(update: Partial<SQLiteEngineState>): void {
  sqliteEngineState = { ...sqliteEngineState, ...update };
  const snapshot = getSQLiteEngineState();
  sqliteEngineListeners.forEach((listener) => listener(snapshot));
}

function reportSQLiteUnavailable(error: unknown): void {
  const message = errorMessage(error);
  databaseStartupStatus = 'storage-unavailable';
  updateSQLiteEngineState({ status: 'unavailable', error: message, sqliteVersion: null });
  if (!initializationFailureReported) {
    initializationFailureReported = true;
    console.error('Failed to initialize SQLite WASM engine:', error);
  }
}

export function setSQLiteDatabaseForTesting(
  db: Database | null,
  status: DatabaseStartupStatus = db ? 'loaded' : 'created'
): void {
  if (dbInstance && dbInstance !== db) {
    try {
      dbInstance.close();
    } catch (error) {
      console.warn('Failed to close SQLite test database:', error);
    }
  }
  dbInstance = db;
  initPromise = db ? Promise.resolve(db) : null;
  sqlJsPromise = null;
  databaseStartupStatus = status;
  initializationFailureReported = false;
  updateSQLiteEngineState({
    status: db ? 'healthy' : 'idle',
    error: null,
    attempts: 0,
    wasmUrl: configuredSqlWasmUrl,
    sqliteVersion: null,
  });
  persistSeq = 0;
  lastPersist = Promise.resolve();
}

export function setSQLiteEngineInitializerForTesting(
  initializer: SQLiteEngineInitializer,
  wasmUrl = SQL_WASM_URL
): void {
  setSQLiteDatabaseForTesting(null);
  sqlJsInitializer = initializer;
  configuredSqlWasmUrl = wasmUrl;
  updateSQLiteEngineState({ wasmUrl });
}

export function restoreDefaultSQLiteEngineInitializerForTesting(): void {
  setSQLiteDatabaseForTesting(null);
  sqlJsInitializer = defaultSqlJsInitializer;
  configuredSqlWasmUrl = SQL_WASM_URL;
  updateSQLiteEngineState({ wasmUrl: SQL_WASM_URL });
}

/**
 * Ordered SQLite schema migrations.
 *
 * Version 1 represents the original schema before the metadata columns that
 * were historically added through best-effort ALTER TABLE statements.
 * Version 2 adds those columns explicitly while remaining compatible with
 * databases where some or all columns already exist.
 */
export const databaseMigrations: readonly DatabaseMigration[] = [
  {
    version: 1,
    name: 'create_baseline_schema',
    up: (db) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS local_books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          subtitle TEXT,
          author TEXT NOT NULL,
          publisher_id TEXT,
          description TEXT,
          price REAL DEFAULT 0,
          currency TEXT DEFAULT 'USD',
          cover_front_json TEXT,
          cover_back_json TEXT,
          is_published INTEGER DEFAULT 0,
          created_at TEXT,
          updated_at TEXT,
          version TEXT
        );

        CREATE TABLE IF NOT EXISTS local_chapters (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          title TEXT NOT NULL,
          chapter_number INTEGER NOT NULL,
          created_at TEXT,
          updated_at TEXT,
          FOREIGN KEY (book_id) REFERENCES local_books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS local_content_blocks (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL,
          block_type TEXT NOT NULL,
          content TEXT,
          meta_json TEXT,
          order_index INTEGER NOT NULL,
          FOREIGN KEY (chapter_id) REFERENCES local_chapters(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS local_references (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          citation_key TEXT NOT NULL,
          title TEXT NOT NULL,
          authors TEXT,
          publication_year TEXT,
          journal_publisher TEXT,
          url TEXT,
          notes TEXT,
          FOREIGN KEY (book_id) REFERENCES local_books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reader_library (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          book_title TEXT NOT NULL,
          author TEXT NOT NULL,
          cover_front_json TEXT,
          bound_phone TEXT NOT NULL,
          bound_device_id TEXT NOT NULL,
          downloaded_at TEXT,
          data_pack_json TEXT,
          last_read_chapter_id TEXT,
          last_read_scroll_pos REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS reader_bookmarks (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          chapter_title TEXT NOT NULL,
          block_id TEXT,
          snippet TEXT,
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS reader_highlights (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          text TEXT NOT NULL,
          note TEXT,
          color TEXT DEFAULT 'yellow',
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS reader_quiz_attempts (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          block_id TEXT NOT NULL,
          quiz_title TEXT,
          score REAL,
          total_marks REAL,
          percentage REAL,
          answers_json TEXT,
          attempted_at TEXT
        );
      `);
    },
  },
  {
    version: 2,
    name: 'add_local_book_metadata',
    up: (db) => {
      const existingColumns = new Set(
        (db.exec('PRAGMA table_info(local_books);')[0]?.values ?? []).map((row) => String(row[1]))
      );
      const additions: ReadonlyArray<readonly [string, string]> = [
        ['category', "TEXT DEFAULT 'General'"],
        ['genre', 'TEXT'],
        ['sub_genre', 'TEXT'],
        ['tags_json', 'TEXT'],
        ['target_audience', 'TEXT'],
        ['language', 'TEXT'],
        ['author_details_json', 'TEXT'],
        ['contributors_json', 'TEXT'],
        ['numbering_config_json', 'TEXT'],
        ['front_matter_json', 'TEXT'],
        ['series_config_json', 'TEXT'],
        ['characters_json', 'TEXT'],
        ['assets_json', 'TEXT'],
        ['is_archived', 'INTEGER DEFAULT 0'],
        ['archived_at', 'TEXT'],
        ['whatsapp_number', 'TEXT'],
        ['access_codes_json', 'TEXT'],
      ];

      for (const [column, definition] of additions) {
        if (!existingColumns.has(column)) {
          db.run(`ALTER TABLE local_books ADD COLUMN ${column} ${definition};`);
        }
      }
    },
  },
];

export function getDatabaseUserVersion(db: Database): number {
  return Number(db.exec('PRAGMA user_version;')[0]?.values[0]?.[0] ?? 0);
}

export function applyDatabaseMigrations(
  db: Database,
  migrations: readonly DatabaseMigration[] = databaseMigrations
): void {
  const orderedMigrations = [...migrations].sort((left, right) => left.version - right.version);
  const versions = new Set<number>();

  for (const migration of orderedMigrations) {
    if (!Number.isInteger(migration.version) || migration.version <= 0 || versions.has(migration.version)) {
      throw new Error(`Invalid database migration version: ${migration.version}`);
    }
    versions.add(migration.version);
  }

  let currentVersion = getDatabaseUserVersion(db);
  for (const migration of orderedMigrations) {
    if (migration.version <= currentVersion) continue;

    let transactionStarted = false;
    try {
      db.run('BEGIN TRANSACTION;');
      transactionStarted = true;
      migration.up(db);
      db.run(`PRAGMA user_version = ${migration.version};`);
      db.run('COMMIT;');
      transactionStarted = false;
      currentVersion = migration.version;
    } catch (error) {
      let rollbackDetails = '';
      if (transactionStarted) {
        try {
          db.run('ROLLBACK;');
        } catch (rollbackError) {
          rollbackDetails = ` Rollback also failed: ${errorMessage(rollbackError)}.`;
        }
      }
      throw new Error(
        `Database migration ${migration.version} (${migration.name}) failed: ${errorMessage(error)}.${rollbackDetails}`,
        { cause: error }
      );
    }
  }
}

export function getSqlJsLocateFile(file: string): string {
  return file.endsWith('.wasm') ? configuredSqlWasmUrl : file;
}

/**
 * A successful module load is not enough: instantiate SQLite and execute a
 * query before exposing the engine as healthy.
 */
export function runSQLiteEngineHealthCheck(SQL: SqlJsStatic): string {
  let healthDatabase: Database | null = null;
  try {
    healthDatabase = new SQL.Database();
    const result = healthDatabase.exec('SELECT sqlite_version();');
    const sqliteVersion = String(result[0]?.values[0]?.[0] ?? '');
    if (!sqliteVersion) {
      throw new Error('SQLite engine health check returned no version.');
    }
    return sqliteVersion;
  } finally {
    healthDatabase?.close();
  }
}

/**
 * Load exactly one sql.js engine from the Vite-emitted URL. The promise,
 * including a rejected result, remains shared until explicit retry.
 */
async function initializeSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise;

  updateSQLiteEngineState({
    status: 'initializing',
    error: null,
    attempts: sqliteEngineState.attempts + 1,
    wasmUrl: configuredSqlWasmUrl,
    sqliteVersion: null,
  });

  sqlJsPromise = (async () => {
    try {
      const SQL = await sqlJsInitializer({
        locateFile: getSqlJsLocateFile,
      });
      const sqliteVersion = runSQLiteEngineHealthCheck(SQL);
      updateSQLiteEngineState({
        status: 'healthy',
        error: null,
        sqliteVersion,
      });
      return SQL;
    } catch (error) {
      reportSQLiteUnavailable(error);
      throw error;
    }
  })();

  return sqlJsPromise;
}

export async function retrySQLiteInitialization(): Promise<Database> {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (error) {
      console.warn('Failed to close SQLite database before retry:', error);
    }
  }
  dbInstance = null;
  initPromise = null;
  sqlJsPromise = null;
  initializationFailureReported = false;
  updateSQLiteEngineState({
    status: 'idle',
    error: null,
    sqliteVersion: null,
  });
  return getSQLiteDB();
}

/**
 * Initialize SQLite WASM engine & create tables if missing
 */
export async function getSQLiteDB(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let initializedDatabase: Database | null = null;
    try {
      const SQL = await initializeSqlJs();

      const savedBytes = await loadDbFromIndexedDB();
      let recoveredCorruptBytes = false;
      if (savedBytes) {
        try {
          initializedDatabase = new SQL.Database(savedBytes);
          initializedDatabase.exec('PRAGMA schema_version;');
          databaseStartupStatus = 'loaded';
        } catch (databaseError) {
          databaseStartupStatus = 'corrupted';
          if (initializedDatabase) {
            try {
              initializedDatabase.close();
            } catch (closeError) {
              console.warn('Failed to close corrupt SQLite database handle:', closeError);
            }
          }
          initializedDatabase = null;
          await saveBytesToIndexedDB(DB_RECOVERY_KEY, savedBytes);
          console.warn('Saved corrupt SQLite bytes for recovery before creating a replacement:', databaseError);
          initializedDatabase = new SQL.Database();
          recoveredCorruptBytes = true;
        }
      } else {
        initializedDatabase = new SQL.Database();
        databaseStartupStatus = 'created';
      }

      initializedDatabase.run('PRAGMA foreign_keys = ON;');
      applyDatabaseMigrations(initializedDatabase);

      dbInstance = initializedDatabase;
      await persistDbToIndexedDB();
      if (recoveredCorruptBytes) {
        databaseStartupStatus = 'recovered';
      }
      return dbInstance;
    } catch (error) {
      if (initializedDatabase) {
        try {
          initializedDatabase.close();
        } catch (closeError) {
          console.warn('Failed to close SQLite database after initialization error:', closeError);
        }
      }
      dbInstance = null;
      reportSQLiteUnavailable(error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Helper to sanitize bind parameters for sql.js so no `undefined` values are ever passed.
 */
function sanitizeParams(params: any[] = []): any[] {
  return params.map(val => (val === undefined ? null : val));
}

function safeRun(db: Database, sql: string, params: any[] = []): Database {
  return db.run(sql, sanitizeParams(params));
}

function safeExec(db: Database, sql: string, params: any[] = []): any[] {
  return db.exec(sql, sanitizeParams(params));
}

/**
 * Execute a read-only SQL query without persisting.
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getSQLiteDB();
  const res = safeExec(db, sql, params);
  return res;
}

/**
 * Execute a mutating SQL statement and persist the database.
 */
export async function executeMutation(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getSQLiteDB();
  const res = safeExec(db, sql, params);
  await persistDbToIndexedDB();
  return res;
}

/**
 * Save / Upsert Book into local SQLite storage
 */
export async function saveBookToSQLite(book: Book): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(
      db,
      `INSERT OR REPLACE INTO local_books
       (id, title, subtitle, author, publisher_id, description, category, genre, sub_genre, tags_json, target_audience, language, author_details_json, contributors_json, numbering_config_json, front_matter_json, series_config_json, characters_json, assets_json, is_archived, archived_at, whatsapp_number, access_codes_json, price, currency, cover_front_json, cover_back_json, is_published, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        book.id || '',
        book.title || '',
        book.subtitle || '',
        book.author || '',
        book.publisherId || '',
        book.description || '',
        book.category || 'General Non-Fiction',
        book.genre || '',
        book.subGenre || '',
        JSON.stringify(book.tags || []),
        book.targetAudience || '',
        book.language || 'English (US)',
        JSON.stringify(book.authorDetails || {}),
        JSON.stringify(book.contributors || []),
        JSON.stringify(book.numberingConfig || {
          numberingStyle: 'arabic',
          numberingPrefix: 'Chapter',
          numberingSuffix: '',
          chapterDesignStyle: 'classic',
          showChapterNumbersInTOC: true,
        }),
        JSON.stringify(book.frontMatter || {}),
        JSON.stringify(book.seriesConfig || {}),
        JSON.stringify(book.characters || []),
        JSON.stringify(book.assets || []),
        book.isArchived ? 1 : 0,
        book.archivedAt || '',
        book.whatsappNumber || '',
        JSON.stringify(book.accessCodes || []),
        typeof book.price === 'number' ? book.price : 0,
        book.currency || 'USD',
        JSON.stringify(book.coverFront || {}),
        JSON.stringify(book.coverBack || {}),
        book.isPublished ? 1 : 0,
        book.createdAt || new Date().toISOString(),
        book.updatedAt || new Date().toISOString(),
        book.version || '1.0.0',
      ]
    );

    const incomingChapterIds = new Set((book.chapters || []).map(c => c.id));

    if (incomingChapterIds.size === 0) {
      safeRun(db, `DELETE FROM local_content_blocks WHERE chapter_id IN (SELECT id FROM local_chapters WHERE book_id = ?);`, [book.id]);
      safeRun(db, `DELETE FROM local_chapters WHERE book_id = ?;`, [book.id]);
    } else {
      const placeholders = Array.from(incomingChapterIds).map(() => '?').join(',');
      safeRun(
        db,
        `DELETE FROM local_content_blocks WHERE chapter_id IN (SELECT id FROM local_chapters WHERE book_id = ? AND id NOT IN (${placeholders}));`,
        [book.id, ...Array.from(incomingChapterIds)]
      );
      safeRun(
        db,
        `DELETE FROM local_chapters WHERE book_id = ? AND id NOT IN (${placeholders});`,
        [book.id, ...Array.from(incomingChapterIds)]
      );
    }

    for (const chapter of book.chapters || []) {
      safeRun(
        db,
        `INSERT OR REPLACE INTO local_chapters (id, book_id, title, chapter_number, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          chapter.id || '',
          book.id || '',
          chapter.title || '',
          typeof chapter.chapterNumber === 'number' ? chapter.chapterNumber : 1,
          chapter.createdAt || new Date().toISOString(),
          chapter.updatedAt || new Date().toISOString(),
        ]
      );

      safeRun(db, `DELETE FROM local_content_blocks WHERE chapter_id = ?;`, [chapter.id]);

      for (const block of chapter.blocks || []) {
        safeRun(
          db,
          `INSERT OR REPLACE INTO local_content_blocks (id, chapter_id, block_type, content, meta_json, order_index)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            block.id || '',
            chapter.id || '',
            block.type || 'paragraph',
            block.content || '',
            JSON.stringify(block.meta || {}),
            typeof block.orderIndex === 'number' ? block.orderIndex : 0,
          ]
        );
      }
    }

    safeRun(db, `DELETE FROM local_references WHERE book_id = ?;`, [book.id]);

    for (const ref of book.references || []) {
      safeRun(
        db,
        `INSERT OR REPLACE INTO local_references (id, book_id, citation_key, title, authors, publication_year, journal_publisher, url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ref.id || '',
          book.id || '',
          ref.citationKey || '',
          ref.title || '',
          ref.authors || '',
          ref.publicationYear || '',
          ref.journalOrPublisher || '',
          ref.url || '',
          ref.notes || '',
        ]
      );
    }

    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }

  await persistDbToIndexedDB();
}

/**
 * Fetch all local books from SQLite database
 */
export async function getAllLocalBooks(): Promise<Book[]> {
  const db = await getSQLiteDB();

  const booksResult = safeExec(db, `
    SELECT id, title, subtitle, author, publisher_id, description, category, genre, sub_genre, tags_json, target_audience, language, author_details_json, contributors_json, numbering_config_json, front_matter_json, series_config_json, characters_json, assets_json, is_archived, archived_at, whatsapp_number, access_codes_json, price, currency, cover_front_json, cover_back_json, is_published, created_at, updated_at, version
    FROM local_books
    ORDER BY updated_at DESC;
  `);
  if (!booksResult.length) return [];

  const books: Book[] = [];
  const rows = booksResult[0].values;

  for (const row of rows) {
    const bookId = row[0] as string;
    const title = row[1] as string;
    const subtitle = row[2] as string;
    const author = row[3] as string;
    const publisherId = row[4] as string;
    const description = row[5] as string;
    const category = (row[6] as string) || 'General Non-Fiction';
    const genre = row[7] as string;
    const subGenre = row[8] as string;
    const tags = JSON.parse((row[9] as string) || '[]');
    const targetAudience = row[10] as string;
    const language = row[11] as string;
    const authorDetails = JSON.parse((row[12] as string) || '{}');
    const contributors = JSON.parse((row[13] as string) || '[]');
    const numberingConfig = JSON.parse((row[14] as string) || '{"numberingStyle":"arabic","numberingPrefix":"Chapter","numberingSuffix":"","chapterDesignStyle":"classic","showChapterNumbersInTOC":true}');
    const frontMatter = JSON.parse((row[15] as string) || '{}');
    const seriesConfig = JSON.parse((row[16] as string) || '{}');
    const characters = JSON.parse((row[17] as string) || '[]');
    const assets = JSON.parse((row[18] as string) || '[]');
    const isArchived = Boolean(row[19]);
    const archivedAt = row[20] as string;
    const whatsappNumber = row[21] as string;
    const accessCodes = JSON.parse((row[22] as string) || '[]');
    const price = row[23] as number;
    const currency = row[24] as string;
    const coverFront = JSON.parse((row[25] as string) || '{}');
    const coverBack = JSON.parse((row[26] as string) || '{}');
    const isPublished = Boolean(row[27]);
    const createdAt = row[28] as string;
    const updatedAt = row[29] as string;
    const version = row[30] as string;

    const chapRes = safeExec(db, 'SELECT * FROM local_chapters WHERE book_id = ? ORDER BY chapter_number ASC;', [bookId]);
    const chapters: Chapter[] = [];

    if (chapRes.length) {
      for (const chapRow of chapRes[0].values) {
        const chapId = chapRow[0] as string;
        const chapTitle = chapRow[2] as string;
        const chapNum = chapRow[3] as number;
        const chapCreated = chapRow[4] as string;
        const chapUpdated = chapRow[5] as string;

        const blockRes = safeExec(db, 'SELECT * FROM local_content_blocks WHERE chapter_id = ? ORDER BY order_index ASC;', [chapId]);
        const blocks: ContentBlock[] = [];

        if (blockRes.length) {
          for (const bRow of blockRes[0].values) {
            blocks.push({
              id: bRow[0] as string,
              chapterId: bRow[1] as string,
              type: bRow[2] as any,
              content: bRow[3] as string,
              meta: JSON.parse(bRow[4] as string || '{}'),
              orderIndex: bRow[5] as number,
            });
          }
        }

        chapters.push({
          id: chapId,
          bookId,
          title: chapTitle,
          chapterNumber: chapNum,
          createdAt: chapCreated,
          updatedAt: chapUpdated,
          blocks,
        });
      }
    }

    const refRes = safeExec(db, 'SELECT * FROM local_references WHERE book_id = ?;', [bookId]);
    const references: ReferenceItem[] = [];

    if (refRes.length) {
      for (const rRow of refRes[0].values) {
        references.push({
          id: rRow[0] as string,
          bookId: rRow[1] as string,
          citationKey: rRow[2] as string,
          title: rRow[3] as string,
          authors: rRow[4] as string,
          publicationYear: rRow[5] as string,
          journalOrPublisher: rRow[6] as string,
          url: rRow[7] as string,
          notes: rRow[8] as string,
        });
      }
    }

    books.push({
      id: bookId,
      title,
      subtitle,
      author,
      authorDetails,
      contributors,
      publisherId,
      description,
      category,
      genre,
      subGenre,
      tags,
      targetAudience,
      language,
      numberingConfig,
      frontMatter,
      seriesConfig,
      characters,
      assets,
      isArchived,
      archivedAt,
      whatsappNumber,
      accessCodes,
      price,
      currency,
      coverFront,
      coverBack,
      chapters,
      references,
      isPublished,
      createdAt,
      updatedAt,
      version,
    });
  }

  return books;
}

/**
 * Delete a book from local SQLite database
 */
export async function deleteBookFromSQLite(bookId: string): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(db, `DELETE FROM local_content_blocks WHERE chapter_id IN (SELECT id FROM local_chapters WHERE book_id = ?);`, [bookId]);
    safeRun(db, `DELETE FROM local_chapters WHERE book_id = ?;`, [bookId]);
    safeRun(db, `DELETE FROM local_references WHERE book_id = ?;`, [bookId]);
    safeRun(db, `DELETE FROM local_books WHERE id = ?;`, [bookId]);
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Save imported book into offline reader library in SQLite
 */
export async function saveToReaderLibrarySQLite(item: ReaderLibraryItem): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(
      db,
      `INSERT OR REPLACE INTO reader_library
       (id, book_id, book_title, author, cover_front_json, bound_phone, bound_device_id, downloaded_at, data_pack_json, last_read_chapter_id, last_read_scroll_pos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id || '',
        item.bookId || '',
        item.bookTitle || '',
        item.author || '',
        JSON.stringify(item.coverFront || {}),
        item.boundPhoneNumber || '',
        item.boundDeviceId || '',
        item.downloadedAt || new Date().toISOString(),
        item.dataPackJson || '',
        item.lastReadChapterId || '',
        item.lastReadScrollPos || 0,
      ]
    );
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Delete a book from offline reader library in SQLite
 */
export async function deleteFromReaderLibrarySQLite(id: string): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(db, 'DELETE FROM reader_library WHERE id = ?;', [id]);
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Fetch reader library items from SQLite
 */
export async function getReaderLibrarySQLite(): Promise<ReaderLibraryItem[]> {
  const db = await getSQLiteDB();
  const res = safeExec(db, 'SELECT * FROM reader_library ORDER BY downloaded_at DESC;');
  if (!res.length) return [];

  return res[0].values.map((row) => ({
    id: row[0] as string,
    bookId: row[1] as string,
    bookTitle: row[2] as string,
    author: row[3] as string,
    coverFront: JSON.parse(row[4] as string || '{}'),
    boundPhoneNumber: row[5] as string,
    boundDeviceId: row[6] as string,
    downloadedAt: row[7] as string,
    dataPackJson: row[8] as string,
    isUnlocked: true,
    lastReadChapterId: row[9] as string,
    lastReadScrollPos: row[10] as number,
  }));
}

/**
 * Add Bookmark to SQLite
 */
export async function addBookmarkSQLite(bookmark: Bookmark): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(
      db,
      `INSERT OR REPLACE INTO reader_bookmarks (id, book_id, chapter_id, chapter_title, block_id, snippet, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        bookmark.id || '',
        bookmark.bookId || '',
        bookmark.chapterId || '',
        bookmark.chapterTitle || '',
        bookmark.blockId || '',
        bookmark.snippet || '',
        bookmark.createdAt || new Date().toISOString(),
      ]
    );
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Get Bookmarks for book from SQLite
 */
export async function getBookmarksSQLite(bookId: string): Promise<Bookmark[]> {
  const db = await getSQLiteDB();
  const res = safeExec(db, 'SELECT * FROM reader_bookmarks WHERE book_id = ? ORDER BY created_at DESC;', [bookId]);
  if (!res.length) return [];

  return res[0].values.map((row) => ({
    id: row[0] as string,
    bookId: row[1] as string,
    chapterId: row[2] as string,
    chapterTitle: row[3] as string,
    blockId: row[4] as string,
    snippet: row[5] as string,
    createdAt: row[6] as string,
  }));
}

/**
 * Add Highlight/Note to SQLite
 */
export async function addHighlightSQLite(highlight: HighlightNote): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(
      db,
      `INSERT OR REPLACE INTO reader_highlights (id, book_id, chapter_id, text, note, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        highlight.id || '',
        highlight.bookId || '',
        highlight.chapterId || '',
        highlight.text || '',
        highlight.note || '',
        highlight.color || 'yellow',
        highlight.createdAt || new Date().toISOString(),
      ]
    );
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Get Highlights for book from SQLite
 */
export async function getHighlightsSQLite(bookId: string): Promise<HighlightNote[]> {
  const db = await getSQLiteDB();
  const res = safeExec(db, 'SELECT * FROM reader_highlights WHERE book_id = ? ORDER BY created_at DESC;', [bookId]);
  if (!res.length) return [];

  return res[0].values.map((row) => ({
    id: row[0] as string,
    bookId: row[1] as string,
    chapterId: row[2] as string,
    text: row[3] as string,
    note: row[4] as string,
    color: row[5] as any,
    createdAt: row[6] as string,
  }));
}

/**
 * Delete Highlight from SQLite
 */
export async function deleteHighlightSQLite(id: string): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(db, 'DELETE FROM reader_highlights WHERE id = ?;', [id]);
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Save / Replace Quiz Attempt in SQLite
 */
export async function saveQuizAttemptSQLite(attempt: QuizAttempt): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(
      db,
      `INSERT OR REPLACE INTO reader_quiz_attempts (id, book_id, chapter_id, block_id, quiz_title, score, total_marks, percentage, answers_json, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        attempt.id || `${attempt.bookId}_${attempt.chapterId}_${attempt.blockId}`,
        attempt.bookId || '',
        attempt.chapterId || '',
        attempt.blockId || '',
        attempt.quizTitle || 'Practice Revision Quiz',
        attempt.score || 0,
        attempt.totalMarks || 0,
        attempt.percentage || 0,
        JSON.stringify(attempt.answers || {}),
        attempt.attemptedAt || new Date().toISOString(),
      ]
    );
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

/**
 * Get all Quiz Attempts for a book from SQLite
 */
export async function getQuizAttemptsSQLite(bookId: string): Promise<QuizAttempt[]> {
  const db = await getSQLiteDB();
  const res = safeExec(db, 'SELECT * FROM reader_quiz_attempts WHERE book_id = ? ORDER BY attempted_at DESC;', [bookId]);
  if (!res.length) return [];

  return res[0].values.map((row) => {
    let answers: Record<string, number> = {};
    try {
      answers = JSON.parse(row[8] as string || '{}');
    } catch (e) {
      answers = {};
    }

    return {
      id: row[0] as string,
      bookId: row[1] as string,
      chapterId: row[2] as string,
      blockId: row[3] as string,
      quizTitle: row[4] as string,
      score: Number(row[5]) || 0,
      totalMarks: Number(row[6]) || 0,
      percentage: Number(row[7]) || 0,
      answers,
      attemptedAt: row[9] as string,
    };
  });
}

/**
 * Delete Quiz Attempts for a book from SQLite
 */
export async function deleteQuizAttemptsSQLite(bookId: string): Promise<void> {
  const db = await getSQLiteDB();
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    safeRun(db, 'DELETE FROM reader_quiz_attempts WHERE book_id = ?;', [bookId]);
    db.run('COMMIT;');
  } catch (e) {
    try { db.run('ROLLBACK;'); } catch {}
    throw e;
  }
  await persistDbToIndexedDB();
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function computeDatabaseSha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isBackupManifest(value: unknown): value is LocalDatabaseBackupManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as Record<string, unknown>;
  return (
    typeof manifest.productName === 'string' &&
    typeof manifest.backupFormatVersion === 'string' &&
    typeof manifest.applicationVersion === 'string' &&
    manifest.applicationVersion.length > 0 &&
    typeof manifest.createdAt === 'string' &&
    !Number.isNaN(Date.parse(manifest.createdAt)) &&
    Number.isInteger(manifest.databaseByteLength) &&
    (manifest.databaseByteLength as number) >= 0 &&
    typeof manifest.sha256Checksum === 'string' &&
    /^[a-f0-9]{64}$/i.test(manifest.sha256Checksum)
  );
}

export async function createLocalDatabaseBackup(
  databaseBytes: Uint8Array,
  applicationVersion = SQLITE_APPLICATION_VERSION
): Promise<Blob> {
  const manifest: LocalDatabaseBackupManifest = {
    productName: SQLITE_BACKUP_PRODUCT_NAME,
    backupFormatVersion: SQLITE_BACKUP_FORMAT_VERSION,
    applicationVersion,
    createdAt: new Date().toISOString(),
    databaseByteLength: databaseBytes.byteLength,
    sha256Checksum: await computeDatabaseSha256(databaseBytes),
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('database.sqlite', databaseBytes);
  return zip.generateAsync({ type: 'blob' });
}

export async function exportLocalDatabaseBackup(): Promise<Blob> {
  const db = await getSQLiteDB();
  return createLocalDatabaseBackup(db.export());
}

export async function downloadLocalDatabaseBackup(): Promise<void> {
  const backup = await exportLocalDatabaseBackup();
  const url = URL.createObjectURL(backup);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `empire-of-trust-sqlite-backup-${timestamp}.zip`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export async function validateLocalDatabaseBackup(
  backup: Blob
): Promise<LocalDatabaseBackupValidation> {
  try {
    const zip = await JSZip.loadAsync(backup);
    const manifestFile = zip.file('manifest.json');
    const databaseFile = zip.file('database.sqlite');
    if (!manifestFile || !databaseFile) {
      return { valid: false, error: 'Invalid backup: manifest.json and database.sqlite are required.' };
    }

    let parsedManifest: unknown;
    try {
      parsedManifest = JSON.parse(await manifestFile.async('string'));
    } catch {
      return { valid: false, error: 'Invalid backup: manifest.json is malformed.' };
    }

    if (!isBackupManifest(parsedManifest)) {
      return { valid: false, error: 'Invalid backup: manifest fields are malformed.' };
    }
    const manifest = parsedManifest;
    if (manifest.productName !== SQLITE_BACKUP_PRODUCT_NAME) {
      return { valid: false, error: 'Invalid backup: productName does not match this application.' };
    }
    if (manifest.backupFormatVersion !== SQLITE_BACKUP_FORMAT_VERSION) {
      return { valid: false, error: 'Invalid backup: backupFormatVersion is not supported.' };
    }

    const databaseBytes = await databaseFile.async('uint8array');
    if (databaseBytes.byteLength !== manifest.databaseByteLength) {
      return { valid: false, error: 'Invalid backup: database byte length does not match the manifest.' };
    }

    const checksum = await computeDatabaseSha256(databaseBytes);
    if (checksum.toLowerCase() !== manifest.sha256Checksum.toLowerCase()) {
      return { valid: false, error: 'Invalid backup: SHA-256 checksum does not match the manifest.' };
    }

    return { valid: true, manifest, databaseBytes };
  } catch (error) {
    return { valid: false, error: `Invalid backup ZIP: ${errorMessage(error)}` };
  }
}

export async function restoreLocalDatabaseBackup(
  backup: Blob
): Promise<LocalDatabaseRestoreResult> {
  const validation = await validateLocalDatabaseBackup(backup);
  if (!validation.valid || !validation.databaseBytes) {
    return {
      success: false,
      requiresReload: false,
      message: validation.error ?? 'The SQLite backup is invalid.',
    };
  }

  let candidateDatabase: Database | null = null;
  try {
    const SQL = await initializeSqlJs();
    candidateDatabase = new SQL.Database(validation.databaseBytes);
    candidateDatabase.exec('PRAGMA schema_version;');
    candidateDatabase.run('PRAGMA foreign_keys = ON;');
    applyDatabaseMigrations(candidateDatabase);
    const restoredBytes = candidateDatabase.export();

    const currentDatabase = dbInstance ?? await getSQLiteDB();
    const currentBytes = currentDatabase.export();

    persistSeq += 1;
    try {
      await lastPersist;
    } catch (persistenceError) {
      console.warn('Previous SQLite persistence failed before restore:', persistenceError);
    }

    await saveBytesToIndexedDB(EMERGENCY_BACKUP_KEY, currentBytes);
    await saveBytesToIndexedDB(DB_KEY, restoredBytes);

    const previousDatabase = dbInstance;
    dbInstance = candidateDatabase;
    candidateDatabase = null;
    initPromise = Promise.resolve(dbInstance);
    lastPersist = Promise.resolve();
    databaseStartupStatus = 'restore-required';

    if (previousDatabase && previousDatabase !== dbInstance) {
      try {
        previousDatabase.close();
      } catch (closeError) {
        console.warn('Failed to close the previous SQLite database after restore:', closeError);
      }
    }

    return {
      success: true,
      requiresReload: true,
      message: 'SQLite database restored successfully. Reload the application to use the restored data.',
    };
  } catch (error) {
    if (candidateDatabase) {
      try {
        candidateDatabase.close();
      } catch (closeError) {
        console.warn('Failed to close invalid restored SQLite database:', closeError);
      }
    }
    return {
      success: false,
      requiresReload: false,
      message: `SQLite restore failed: ${errorMessage(error)}`,
    };
  }
}
