import express, {
  type NextFunction, type Request, type Response, type Router,
} from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

const PERMISSIONS = new Set([
  'staff.portal.view', 'staff.manage', 'books.view', 'books.edit', 'series.view',
  'series.edit', 'characters.manage', 'assets.manage', 'payments.review',
  'publishing.manage', 'audit.view', 'audit.export', 'team.view', 'team.manage',
  'team.approve',
]);
const ROLES = new Set(['viewer', 'editor', 'producer', 'publisher', 'administrator']);
const REQUESTED_ROLES = new Set(['viewer', 'editor', 'producer', 'publisher']);
const ACTIVE_ADMIN_PERMISSIONS = ['team.approve', 'team.manage'];

type AuthVerifier = (token: string) => Promise<DecodedIdToken>;
type AuthedResponse = Response & { locals: { auth: DecodedIdToken } };

const fail = (response: Response, status: number, error: string) =>
  response.status(status).json({ error });

const text = (value: unknown, max: number, required = true) => {
  if (typeof value !== 'string') throw new Error('Expected a string value.');
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max) {
    throw new Error(`String must be ${required ? '1-' : '0-'}${max} characters.`);
  }
  return normalized;
};

const stringList = (value: unknown, maxItems: number, itemMax = 128) => {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error('Invalid list value.');
  const items = value.map((item) => text(item, itemMax));
  if (new Set(items).size !== items.length) throw new Error('Duplicate list entries are not allowed.');
  return items;
};

const exactKeys = (body: unknown, allowed: string[]) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('A JSON object is required.');
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new Error('The request contains unsupported fields.');
  }
  return body as Record<string, unknown>;
};

const validCandidate = (value: Record<string, unknown> | undefined, uid: string) =>
  Boolean(
    value && value.uid === uid && value.status === 'pending' &&
    typeof value.email === 'string' && value.email.length > 0 && value.email.length <= 320 &&
    typeof value.displayName === 'string' && value.displayName.length > 0 &&
    value.displayName.length <= 160 &&
    typeof value.requestedRole === 'string' && REQUESTED_ROLES.has(value.requestedRole) &&
    typeof value.reason === 'string' && value.reason.length > 0 && value.reason.length <= 2000,
  );

const bearerToken = (request: Request) => {
  const header = request.header('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

const isGenuineGoogleToken = (token: DecodedIdToken) =>
  token.firebase?.sign_in_provider === 'google.com' &&
  token.email_verified === true &&
  !token.uid.startsWith('google-browser-') &&
  !token.uid.startsWith('google-browser-fallback-');

const sessionId = (request: Request) => {
  const value = request.header('x-staff-session-id') || 'server-session';
  return text(value, 128);
};

const auditRecord = (
  id: string,
  actor: { uid: string; displayName: string },
  targetUid: string,
  action: string,
  previousState: Record<string, unknown> | null,
  nextState: Record<string, unknown> | null,
  changedFields: string[],
  reason: string,
  session: string,
) => ({
  id,
  staffUid: actor.uid,
  actorUid: actor.uid,
  targetUid,
  staffDisplayName: actor.displayName,
  actorDisplayName: actor.displayName,
  action,
  entityType: 'staffAccessRequest',
  entityId: targetUid,
  hierarchy: {},
  changedFields,
  before: previousState,
  after: nextState,
  previousState,
  nextState,
  reason,
  sessionId: session,
  deviceId: 'server',
  timestamp: FieldValue.serverTimestamp(),
  source: 'server',
});

const requireAdministrator = async (database: Firestore, token: DecodedIdToken) => {
  const snapshot = await database.collection('staffUsers').doc(token.uid).get();
  const staff = snapshot.data();
  if (
    !snapshot.exists || staff?.uid !== token.uid || staff.status !== 'active' ||
    !Array.isArray(staff.permissions) ||
    !ACTIVE_ADMIN_PERMISSIONS.some((permission) => staff.permissions.includes(permission))
  ) {
    throw Object.assign(new Error('Active team approval permission is required.'), { status: 403 });
  }
  return staff as { uid: string; displayName: string; permissions: string[] };
};

export function createStaffAccessRouter(database: Firestore, verifyIdToken: AuthVerifier): Router {
  const router = express.Router();
  router.use(async (request: Request, response: Response, next: NextFunction) => {
    try {
      const rawToken = bearerToken(request);
      if (!rawToken) return fail(response, 401, 'A Firebase ID token is required.');
      const token = await verifyIdToken(rawToken);
      if (!isGenuineGoogleToken(token)) return fail(response, 403, 'A genuine Google identity is required.');
      (response as AuthedResponse).locals.auth = token;
      next();
    } catch {
      return fail(response, 401, 'The Firebase ID token is invalid or expired.');
    }
  });

  router.get('/access-request/me', async (_request, response) => {
    try {
      const token = (response as AuthedResponse).locals.auth;
      const snapshot = await database.collection('staffAccessRequests').doc(token.uid).get();
      response.json({ request: snapshot.exists ? snapshot.data() : null });
    } catch {
      fail(response, 503, 'The staff access service is temporarily unavailable.');
    }
  });

  router.post('/access-request', async (request, response) => {
    try {
      const token = (response as AuthedResponse).locals.auth;
      const body = exactKeys(request.body, ['requestedRole', 'reason']);
      const requestedRole = text(body.requestedRole, 80);
      if (!REQUESTED_ROLES.has(requestedRole)) return fail(response, 400, 'Requested role is not allowed.');
      const reason = text(body.reason, 2000);
      const email = text(token.email, 320);
      const displayName = text(token.name || email.split('@')[0], 160);
      const photoURL = token.picture ? text(token.picture, 2048) : null;
      const requestRef = database.collection('staffAccessRequests').doc(token.uid);
      const auditRef = database.collection('staffAuditLogs').doc();
      const now = FieldValue.serverTimestamp();
      const record = {
        uid: token.uid, email, displayName, photoURL, requestedRole, reason,
        status: 'pending', requestedAt: now, updatedAt: now, reviewedAt: null,
        reviewedBy: null, reviewerName: null, reviewerNotes: '',
        approvedRoles: [], approvedPermissions: [], assignedSeriesIds: [],
        assignedSeasonIds: [], assignedEpisodeIds: [],
      };
      await database.runTransaction(async (transaction) => {
        const [existingRequest, existingStaff] = await Promise.all([
          transaction.get(requestRef),
          transaction.get(database.collection('staffUsers').doc(token.uid)),
        ]);
        if (existingStaff.exists) throw Object.assign(new Error('A staff record already exists.'), { status: 409 });
        if (existingRequest.exists && existingRequest.data()?.status !== 'cancelled') {
          throw Object.assign(new Error('An access request already exists.'), { status: 409 });
        }
        if (existingRequest.exists) transaction.update(requestRef, record);
        else transaction.create(requestRef, record);
        transaction.create(auditRef, auditRecord(
          auditRef.id, { uid: token.uid, displayName }, token.uid,
          'staff.access.requested', null, { status: 'pending', requestedRole },
          ['status', 'requestedRole', 'reason'], reason, sessionId(request),
        ));
      });
      response.status(201).json({ request: record });
    } catch (cause) {
      const error = cause as Error & { status?: number };
      fail(response, error.status || 400, error.message || 'Access request failed.');
    }
  });

  router.post('/access-request/cancel', async (request, response) => {
    try {
      exactKeys(request.body, []);
      const token = (response as AuthedResponse).locals.auth;
      const requestRef = database.collection('staffAccessRequests').doc(token.uid);
      const auditRef = database.collection('staffAuditLogs').doc();
      let cancelledRequest: Record<string, unknown> = {};
      await database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(requestRef);
        const candidate = snapshot.data();
        if (!snapshot.exists || !validCandidate(candidate, token.uid)) {
          throw Object.assign(new Error('A valid pending request is required.'), { status: 409 });
        }
        const now = FieldValue.serverTimestamp();
        cancelledRequest = { ...candidate, status: 'cancelled', updatedAt: now };
        transaction.update(requestRef, cancelledRequest);
        transaction.create(auditRef, auditRecord(
          auditRef.id, { uid: token.uid, displayName: String(candidate?.displayName) },
          token.uid, 'staff.access.cancelled', { status: 'pending' }, { status: 'cancelled' },
          ['status', 'updatedAt'], 'Cancelled by candidate.', sessionId(request),
        ));
      });
      response.json({ request: cancelledRequest });
    } catch (cause) {
      const error = cause as Error & { status?: number };
      fail(response, error.status || 400, error.message || 'Cancellation failed.');
    }
  });

  router.get('/access-requests', async (_request, response) => {
    try {
      const token = (response as AuthedResponse).locals.auth;
      await requireAdministrator(database, token);
      const snapshot = await database.collection('staffAccessRequests')
        .where('status', '==', 'pending').limit(200).get();
      response.json({ requests: snapshot.docs.map((item) => item.data()) });
    } catch (cause) {
      const error = cause as Error & { status?: number };
      fail(response, error.status || 500, error.message);
    }
  });

  router.post('/access-requests/:uid/approve', async (request, response) => {
    try {
      const token = (response as AuthedResponse).locals.auth;
      if (token.uid === request.params.uid) return fail(response, 403, 'Administrators cannot approve themselves.');
      const body = exactKeys(request.body, [
        'roles', 'permissions', 'assignedSeriesIds', 'assignedSeasonIds',
        'assignedEpisodeIds', 'reviewerNotes',
      ]);
      const roles = stringList(body.roles, 20, 80);
      const permissions = stringList(body.permissions, 100, 100);
      const assignedSeriesIds = stringList(body.assignedSeriesIds, 500);
      const assignedSeasonIds = stringList(body.assignedSeasonIds, 1000);
      const assignedEpisodeIds = stringList(body.assignedEpisodeIds, 5000);
      const reviewerNotes = text(body.reviewerNotes || '', 2000, false);
      if (!roles.length || roles.some((role) => !ROLES.has(role))) return fail(response, 400, 'Approval roles are invalid.');
      if (!permissions.length || permissions.some((permission) => !PERMISSIONS.has(permission))) return fail(response, 400, 'Approval permissions are invalid.');
      const requestRef = database.collection('staffAccessRequests').doc(request.params.uid);
      const staffRef = database.collection('staffUsers').doc(request.params.uid);
      const actorRef = database.collection('staffUsers').doc(token.uid);
      const auditRefs = [0, 1, 2].map(() => database.collection('staffAuditLogs').doc());
      let approvedRequest: Record<string, unknown> = {};
      await database.runTransaction(async (transaction) => {
        const [actorSnapshot, candidateSnapshot, staffSnapshot] = await Promise.all([
          transaction.get(actorRef), transaction.get(requestRef), transaction.get(staffRef),
        ]);
        const actor = actorSnapshot.data();
        const candidate = candidateSnapshot.data();
        if (
          !actorSnapshot.exists || actor?.status !== 'active' ||
          !Array.isArray(actor.permissions) ||
          !ACTIVE_ADMIN_PERMISSIONS.some((permission) => actor.permissions.includes(permission))
        ) throw Object.assign(new Error('Active team approval permission is required.'), { status: 403 });
        if (!candidateSnapshot.exists || !validCandidate(candidate, request.params.uid)) {
          throw Object.assign(new Error('A valid pending request is required.'), { status: 409 });
        }
        if (staffSnapshot.exists) throw Object.assign(new Error('The candidate already has a staff record.'), { status: 409 });
        const now = FieldValue.serverTimestamp();
        const staffRecord = {
          uid: candidate.uid, email: candidate.email, displayName: candidate.displayName,
          status: 'active', roles, permissions, assignedSeriesIds, assignedSeasonIds,
          assignedEpisodeIds, createdAt: now, createdBy: token.uid, lastLoginAt: now,
        };
        approvedRequest = {
          ...candidate, status: 'approved', updatedAt: now, reviewedAt: now,
          reviewedBy: token.uid, reviewerName: actor.displayName, reviewerNotes,
          approvedRoles: roles, approvedPermissions: permissions,
          assignedSeriesIds, assignedSeasonIds, assignedEpisodeIds,
        };
        transaction.create(staffRef, staffRecord);
        transaction.update(requestRef, approvedRequest);
        const actorIdentity = { uid: token.uid, displayName: actor.displayName };
        const session = sessionId(request);
        transaction.create(auditRefs[0], auditRecord(auditRefs[0].id, actorIdentity, candidate.uid,
          'staff.access.approved', { status: 'pending' }, { status: 'approved' },
          ['status', 'reviewedAt', 'reviewedBy'], reviewerNotes, session));
        transaction.create(auditRefs[1], auditRecord(auditRefs[1].id, actorIdentity, candidate.uid,
          'staff.roles.assigned', { roles: [] }, { roles }, ['roles'], reviewerNotes, session));
        transaction.create(auditRefs[2], auditRecord(auditRefs[2].id, actorIdentity, candidate.uid,
          'staff.permissions.assigned', { permissions: [] }, { permissions },
          ['permissions', 'assignedSeriesIds', 'assignedSeasonIds', 'assignedEpisodeIds'],
          reviewerNotes, session));
      });
      response.json({ request: approvedRequest });
    } catch (cause) {
      const error = cause as Error & { status?: number };
      fail(response, error.status || 400, error.message || 'Approval failed.');
    }
  });

  router.post('/access-requests/:uid/reject', async (request, response) => {
    try {
      const token = (response as AuthedResponse).locals.auth;
      const body = exactKeys(request.body, ['reviewerNotes']);
      const reviewerNotes = text(body.reviewerNotes, 2000);
      const requestRef = database.collection('staffAccessRequests').doc(request.params.uid);
      const actorRef = database.collection('staffUsers').doc(token.uid);
      const auditRef = database.collection('staffAuditLogs').doc();
      let rejectedRequest: Record<string, unknown> = {};
      await database.runTransaction(async (transaction) => {
        const [actorSnapshot, candidateSnapshot] = await Promise.all([
          transaction.get(actorRef), transaction.get(requestRef),
        ]);
        const actor = actorSnapshot.data();
        const candidate = candidateSnapshot.data();
        if (
          !actorSnapshot.exists || actor?.status !== 'active' ||
          !Array.isArray(actor.permissions) ||
          !ACTIVE_ADMIN_PERMISSIONS.some((permission) => actor.permissions.includes(permission))
        ) throw Object.assign(new Error('Active team approval permission is required.'), { status: 403 });
        if (!candidateSnapshot.exists || candidate?.uid !== request.params.uid || candidate.status !== 'pending') {
          throw Object.assign(new Error('A valid pending request is required.'), { status: 409 });
        }
        const now = FieldValue.serverTimestamp();
        rejectedRequest = {
          ...candidate, status: 'rejected', updatedAt: now, reviewedAt: now,
          reviewedBy: token.uid, reviewerName: actor.displayName, reviewerNotes,
        };
        transaction.update(requestRef, rejectedRequest);
        transaction.create(auditRef, auditRecord(auditRef.id,
          { uid: token.uid, displayName: actor.displayName }, candidate.uid,
          'staff.access.rejected', { status: 'pending' }, { status: 'rejected' },
          ['status', 'reviewedAt', 'reviewedBy', 'reviewerNotes'], reviewerNotes,
          sessionId(request),
        ));
      });
      response.json({ request: rejectedRequest });
    } catch (cause) {
      const error = cause as Error & { status?: number };
      fail(response, error.status || 400, error.message || 'Rejection failed.');
    }
  });

  return router;
}
