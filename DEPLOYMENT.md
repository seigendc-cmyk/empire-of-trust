# App Shell Deployment

Production shell build:

```powershell
npm run build:shell
```

Deploy to Firebase Hosting target `empireot`:

```powershell
npm run deploy:shell
```

Required local file:

```text
.env.local
```

Required values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase project and hosting target:

```text
project: gen-lang-client-0459000055
hosting target: empireot
hosting site: empireot
```

If Firebase auth expires:

```powershell
firebase login --reauth
```

If the hosting target is missing in another checkout:

```powershell
firebase target:apply hosting empireot empireot --project gen-lang-client-0459000055
```
