import express from 'express';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import repositoryConfig from '../firebase-applet-config.json';
import { createStaffAccessRouter } from './staffAccessApi';

const firebaseApp = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || repositoryConfig.projectId,
});
const database = getFirestore(
  firebaseApp,
  process.env.FIRESTORE_DATABASE_ID || repositoryConfig.firestoreDatabaseId,
);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use('/api/staff', createStaffAccessRouter(
  database,
  (token) => getAuth(firebaseApp).verifyIdToken(token, true),
));

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(`Staff API listening on ${port}`));
}

export default app;
