# Empire of Trust

Empire of Trust is a browser-based publishing studio and offline reader. Local structured data is stored in SQLite through `sql.js` and persisted to IndexedDB.

## Requirements

- Node.js 22 or newer
- npm

The repository includes an `.nvmrc` for Node 22.

## Install

```sh
npm install
```

Copy `.env.example` to `.env.local` and configure the required environment values.

## Development

```sh
npm run dev
```

## Validation

Run checks individually:

```sh
npm run typecheck
npm test
npm run build
```

Run the complete local validation sequence:

```sh
npm run check
```

## Database backups

Local database backups contain the complete browser SQLite database. They are checksummed but not encrypted, so store them securely. Do not close the page during backup or restore. Restore validates the archive before replacement, creates an emergency copy of the current database, and requires an application reload after success.

See [Local data foundation](docs/architecture/local-data-foundation.md) for details about persistence, migrations, backup, restore, and corruption recovery.

## Branch workflow

Create focused branches from `main` using a descriptive prefix such as `fix/` or `feat/`. Run `npm run check` before pushing, then open a pull request targeting `main`.

CI runs for pushes to `main`, pushes to `fix/**`, and pull requests targeting `main`. The CI workflow validates the project and does not deploy it.
