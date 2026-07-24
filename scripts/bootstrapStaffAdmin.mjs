import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const repositoryConfig = JSON.parse(
  readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')
);

export const ADMIN_PERMISSIONS = Object.freeze([
  'staff.portal.view',
  'books.view',
  'books.edit',
  'series.view',
  'series.edit',
  'payments.review',
  'publishing.manage',
  'audit.view',
  'team.view',
  'team.manage',
  'team.approve',
]);

export const usage = `Usage:
  npm run bootstrap:staff-admin -- \\
    --uid <firebase-uid> \\
    --email <staff-email> \\
    --display-name "<display name>" \\
    [--project <firebase-project-id>] \\
    [--database <firestore-database-id>] \\
    [--force] \\
    [--add-missing-permissions] \\
    [--check-permissions]

Authentication:
  Use Application Default Credentials, or set GOOGLE_APPLICATION_CREDENTIALS
  to an administrator-controlled service-account JSON file outside this repo.

Safety:
  Existing staffUsers/{uid} documents are never overwritten unless --force is
  supplied explicitly. Use --add-missing-permissions to preserve every existing
  field and add only missing permissions from the administrator permission set.`;

const valueFlags = new Set([
  '--uid',
  '--email',
  '--display-name',
  '--project',
  '--database',
]);

export function parseBootstrapArgs(argv) {
  const result = {
    uid: '',
    email: '',
    displayName: '',
    projectId: process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      repositoryConfig.projectId,
    databaseId: process.env.FIRESTORE_DATABASE_ID ||
      repositoryConfig.firestoreDatabaseId,
    force: false,
    addMissingPermissions: false,
    checkPermissions: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--force') {
      result.force = true;
      continue;
    }
    if (flag === '--add-missing-permissions') {
      result.addMissingPermissions = true;
      continue;
    }
    if (flag === '--check-permissions') {
      result.checkPermissions = true;
      continue;
    }
    if (flag === '--help' || flag === '-h') {
      result.help = true;
      continue;
    }
    if (!valueFlags.has(flag)) {
      throw new Error(`Unknown argument: ${flag}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}`);
    }
    index += 1;
    if (flag === '--uid') result.uid = value.trim();
    if (flag === '--email') result.email = value.trim();
    if (flag === '--display-name') result.displayName = value.trim();
    if (flag === '--project') result.projectId = value.trim();
    if (flag === '--database') result.databaseId = value.trim();
  }

  if (result.help) return result;
  if ([result.force, result.addMissingPermissions, result.checkPermissions].filter(Boolean).length > 1) {
    throw new Error('--force, --add-missing-permissions, and --check-permissions are mutually exclusive.');
  }
  if (!result.uid || result.uid.length > 128 || result.uid.includes('/')) {
    throw new Error('A valid --uid is required (1-128 characters, no slash).');
  }
  if (!result.checkPermissions && (
    !result.email ||
    result.email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)
  )) {
    throw new Error('A valid --email is required.');
  }
  if (!result.checkPermissions && (!result.displayName || result.displayName.length > 160)) {
    throw new Error('A valid --display-name is required (1-160 characters).');
  }
  if (!result.projectId) throw new Error('A Firebase project ID is required.');
  if (!result.databaseId) throw new Error('A Firestore database ID is required.');
  return result;
}

export function buildStaffAdminRecord(args, timestamp) {
  return {
    uid: args.uid,
    email: args.email,
    displayName: args.displayName,
    status: 'active',
    roles: ['administrator'],
    permissions: [...ADMIN_PERMISSIONS],
    assignedSeriesIds: [],
    assignedSeasonIds: [],
    assignedEpisodeIds: [],
    createdAt: timestamp,
    createdBy: 'bootstrapStaffAdmin',
    lastLoginAt: timestamp,
  };
}

export async function bootstrapStaffAdmin(args) {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: args.projectId,
  });
  const database = getFirestore(app, args.databaseId);
  const staffRef = database.collection('staffUsers').doc(args.uid);
  const existing = await staffRef.get();
  if (args.checkPermissions) {
    const data = existing.data();
    const permissions = Array.isArray(data?.permissions) ? data.permissions : [];
    return {
      projectId: args.projectId,
      databaseId: args.databaseId,
      documentPath: staffRef.path,
      overwritten: false,
      permissionsAddedSafely: false,
      checkedOnly: true,
      exists: existing.exists,
      status: data?.status || null,
      roles: Array.isArray(data?.roles) ? data.roles : [],
      missingPermissions: ADMIN_PERMISSIONS.filter((permission) => !permissions.includes(permission)),
    };
  }
  if (existing.exists && args.addMissingPermissions) {
    const existingData = existing.data();
    if (existingData?.uid !== args.uid || existingData?.status !== 'active') {
      throw new Error('Permission maintenance requires a matching active staff record.');
    }
    await staffRef.update({
      permissions: FieldValue.arrayUnion(...ADMIN_PERMISSIONS),
    });
    return {
      projectId: args.projectId,
      databaseId: args.databaseId,
      documentPath: staffRef.path,
      overwritten: false,
      permissionsAddedSafely: true,
      checkedOnly: false,
    };
  }
  if (existing.exists && !args.force) {
    throw new Error(
      `staffUsers/${args.uid} already exists; rerun with --force only after review.`
    );
  }

  const record = buildStaffAdminRecord(args, Timestamp.now());
  if (args.force) {
    await staffRef.set(record);
  } else {
    // create() remains atomic if another administrator races this bootstrap.
    await staffRef.create(record);
  }

  return {
    projectId: args.projectId,
    databaseId: args.databaseId,
    documentPath: staffRef.path,
    overwritten: existing.exists,
    permissionsAddedSafely: false,
    checkedOnly: false,
  };
}

async function main() {
  try {
    const args = parseBootstrapArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage);
      return;
    }
    const summary = await bootstrapStaffAdmin(args);
    console.log('Staff administrator bootstrap completed.');
    console.log(`Project: ${summary.projectId}`);
    console.log(`Database: ${summary.databaseId}`);
    console.log(`Document: ${summary.documentPath}`);
    console.log(`Existing record overwritten: ${summary.overwritten ? 'yes' : 'no'}`);
    console.log(`Missing permissions added safely: ${summary.permissionsAddedSafely ? 'yes' : 'no'}`);
    if (summary.checkedOnly) {
      console.log(`Record exists: ${summary.exists ? 'yes' : 'no'}`);
      console.log(`Status: ${summary.status || 'missing'}`);
      console.log(`Roles: ${summary.roles.join(', ') || 'none'}`);
      console.log(`Missing permissions: ${summary.missingPermissions.join(', ') || 'none'}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap failure.';
    console.error(`Staff administrator bootstrap failed: ${message}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
