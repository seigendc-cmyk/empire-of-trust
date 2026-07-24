# Local data foundation

## Overview

Empire of Trust runs SQLite in the browser through `sql.js`, a WebAssembly build of SQLite. The active database is held in memory. Its exported byte array is persisted to IndexedDB so the application can reopen the same database in a later browser session.

This foundation currently covers:

- ordered SQLite schema migrations;
- serialized IndexedDB persistence;
- local ZIP backup and validated restore;
- corrupt-byte preservation and startup status reporting;
- debounced, ordered Book Studio saves.

Book licence packages use the separate [signed data-pack v3 architecture](../security/signed-datapack-v3.md). Version 3 packages are signed outside the browser and verified locally with public keys; legacy 2.5 packages are read-only migration inputs.

## IndexedDB layout

The browser database is `BookPublisher_SQLite_DB`, with an object store named `sqlite_bytes`.

| Key | Purpose |
| --- | --- |
| `main_sqlite_file` | Active exported SQLite database bytes |
| `corrupted_sqlite_recovery` | Original bytes preserved when startup cannot open the saved database |
| `emergency_backup_before_restore` | Active bytes captured immediately before a validated restore |

An IndexedDB read failure aborts initialization. It is not treated as an empty database, because doing so could overwrite data that was temporarily unreadable.

## Persistence and save ordering

SQLite exports are written through a serialized persistence queue. Sequence numbers prevent an older queued export from overwriting a newer database state. A failed write is returned to the caller, while later persistence attempts can still proceed.

Book Studio retains a 700 ms debounce for edits. Its revision-based save queue collapses rapid edits to the newest state and permits only one save at a time. Explicit flushes wait for edits that arrive during an in-progress save.

Pending Studio saves are flushed before book and major-view switches, publishing, PDF or data-pack export, archive and delete operations, component unmount, `pagehide`, and a hidden `visibilitychange`.

## Schema migrations

`PRAGMA user_version` is the schema version source of truth. Each migration has a positive integer version, a name, and an `up` function.

Every pending migration runs in its own transaction:

1. `BEGIN TRANSACTION`
2. Run the migration.
3. Update `PRAGMA user_version`.
4. `COMMIT`

On failure, the transaction is rolled back and initialization throws an error identifying the failed migration.

Schema version 1 creates the baseline tables. Version 2 adds expanded local-book metadata. The second migration checks `PRAGMA table_info(local_books)` before adding each column, preserving compatibility with legacy version-0 databases that may already contain some or all of those columns.

## Backup format

A local database backup is a ZIP archive containing:

- `manifest.json`
- `database.sqlite`

The manifest contains:

- `productName`
- `backupFormatVersion`
- `applicationVersion`
- `createdAt`
- `databaseByteLength`
- `sha256Checksum`

The checksum is calculated with Web Crypto SHA-256 over the exact `database.sqlite` bytes.

## Restore process

Restore validates the ZIP structure, manifest fields, product name, backup-format version, byte length, and SHA-256 checksum. It then opens the incoming bytes as SQLite and applies pending migrations to the candidate database.

The active database remains untouched until those checks succeed. Restore then:

1. waits for existing persistence work to settle;
2. stores the current bytes under the emergency-backup key;
3. persists the validated candidate as the active database;
4. swaps the in-memory database;
5. returns a reload-required result.

An invalid or unreadable backup does not overwrite the active database.

## Corruption recovery

Startup probes saved bytes before applying migrations. If SQLite cannot open them, the original byte array is saved under `corrupted_sqlite_recovery` before a replacement database is created.

Startup status distinguishes normal loading, first-time creation, recovered corruption, unresolved corruption, and a completed restore that requires reload. If corrupt-byte preservation fails, startup fails rather than silently discarding the bytes.

## Limitations

- The entire SQLite database and each exported copy must fit in browser memory.
- Browser storage quotas and eviction policies still apply.
- Backups and IndexedDB recovery copies are checksummed but not encrypted.
- Page lifecycle flushes are best effort because browsers may terminate a page before asynchronous work completes.
- A successful restore requires reload so every application consumer reopens consistent state.
