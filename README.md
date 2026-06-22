# EOT Firebase Studio

Firebase-only PWA for Empire of Trust episode creation and offline reader packs.

## Stack

- React, TypeScript, Vite, Tailwind CSS
- Firebase Hosting site `empireot`
- Firebase Auth with Google Sign-In
- Firestore collections: `eotEpisodes`, `eotChapters`, `eotParagraphs`, `eotPacks`
- IndexedDB for imported reader packs

## Setup

Copy `.env.example` to `.env.local` and fill the `VITE_FIREBASE_*` values from the Firebase web app configuration.

```bash
npm install
npm run build
```

Deploy after authenticating with Firebase CLI:

```bash
firebase deploy --only hosting:empireot
```
