# EOT Firebase Studio

Firebase-only PWA for Empire of Trust episode creation, offline reader packs, and local reader activity.

## Stack

- React, TypeScript, Vite
- Firebase Hosting site target `empireot`
- Firebase Auth with Google Sign-In
- Firestore collections for episodes, chapters, paragraphs, packs, publishing, production, and QA
- IndexedDB/Dexie for imported reader packs, reader identity, reading progress, and local activity

This app does not use Prisma, Neon, Express APIs, PostgreSQL, custom JWTs, or Cloud Functions.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
copy .env.example .env.local
```

3. Fill `.env.local` with the Firebase Web App config:

```bash
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_MEASUREMENT_ID="..."
VITE_APP_VERSION="local-dev"
```

`.env`, `.env.local`, and `.env.production` are ignored by git.

4. Run locally:

```bash
npm run dev
```

5. Build production assets:

```bash
npm run build:shell
```

## Firebase Deploy

Before deploying, confirm:

- Google sign-in is enabled in Firebase Authentication.
- Your deployed domain and localhost are in Authentication > Settings > Authorized domains.
- Firestore rules allow the admin account to read/write the studio collections.
- `.firebaserc` points the `empireot` hosting target at the correct Firebase project.

Deploy:

```bash
firebase deploy --only hosting:empireot
```

The app is a static Firebase Hosting deployment. SPA rewrites are configured in `firebase.json`.

## Production Smoke Test

Open `/studio/production-test` after signing in as the studio admin. Run the automated checks and then follow the guided checklist:

1. Create test episode
2. Add test chapter
3. Add test paragraph
4. Preview episode
5. Build pack
6. Download pack
7. Import pack into Reader
8. Open imported episode
9. Save reading progress
10. Switch offline and reopen episode

The test dashboard checks Firebase config, Google Auth availability, admin status, Firestore write/read, Dexie availability, reader identity, pack import table, service worker registration, online/offline state, and build version.

## Release Stabilization Checklist

Before deploying a production release, verify:

- Google Auth login works for the super admin and an approved staff account.
- Staff permissions show only allowed modules and direct denied routes show Access Denied.
- Studio can create an episode, add chapters and paragraphs, preview, build, and download a pack.
- Reader can import the pack, open it, save progress, reopen offline, and show ReaderID profile data.
- Library booklet catalogue/import/read flows still render.
- Character, business, property, vehicle, actor, scene, timeline, continuity, asset, commerce, and analytics routes render without crashing.
- Dark and light themes keep text, forms, buttons, sidebars, cards, tables, and navigation readable.
- Mobile routes do not create horizontal scrolling on core reader, studio, import, editor, pack builder, and analytics screens.
- `/studio/production-test` passes Firebase, Auth, Firestore, Dexie, service worker, online/offline, and build-version checks.
- `npm run build:shell` passes locally.
- `firebase deploy --only hosting:empireot` is run only after the build and production-test checks pass.

## Staff Permissions

Staff access uses Firebase Auth Google Sign-In plus Firestore documents in `studioStaff`, keyed by lowercased email address. The permanent super admin is `seigendc@gmail.com` and receives the `*` permission. Staff records can be managed from `/studio/staff` by a user with `staff.manage`.

Frontend permission checks control navigation and route UX only. Firestore Security Rules must enforce the same roles and permissions server-side before these controls are treated as production security boundaries. Add rules for `studioStaff`, `studioAuditLogs`, episode, pack, licensing, mall, story, production, and settings collections so users can only read/write data allowed by their staff record.

## Premium Advertising

The advertising and Business Spotlight system is documented in [docs/advertising-system.md](docs/advertising-system.md). It uses Firestore collections plus Dexie offline caches, with no backend API dependency.

## Local Draft Mode

If Firebase environment values are missing, the app shows a configuration warning and keeps safe local draft features available where supported. Firestore, Google Auth, and admin-only production tests require a configured Firebase project.
