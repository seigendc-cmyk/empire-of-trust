import React from 'react';
import { act } from 'react';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffAuthContext, type StaffAuthState } from '../contexts/StaffAuthContext';
import { RequireAnyPermission, RequireStaff } from '../components/routing/StaffGuards';
import { createStaffAccessRouter } from '../../server/staffAccessApi';
import type { StaffUser } from '../types/staff';

class FakeSnapshot {
  constructor(public id: string, private value: Record<string, unknown> | undefined) {}
  get exists() { return Boolean(this.value); }
  data() { return this.value; }
}
class FakeRef {
  constructor(public store: Map<string, Record<string, unknown>>, public path: string) {}
  get id() { return this.path.split('/').at(-1) || ''; }
  async get() { return new FakeSnapshot(this.id, this.store.get(this.path)); }
}
let generatedId = 1;
class FakeQuery {
  private filter: [string, unknown] | null = null;
  private maximum = 200;
  constructor(private store: Map<string, Record<string, unknown>>, private name: string) {}
  where(field: string, _operator: string, value: unknown) { this.filter = [field, value]; return this; }
  orderBy() { return this; }
  limit(value: number) { this.maximum = value; return this; }
  async get() {
    const prefix = `${this.name}/`;
    const docs = [...this.store.entries()]
      .filter(([path, value]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/') &&
        (!this.filter || value[this.filter[0]] === this.filter[1]))
      .slice(0, this.maximum)
      .map(([path, value]) => new FakeSnapshot(path.slice(prefix.length), value));
    return { docs };
  }
  doc(id = `audit-${generatedId++}`) { return new FakeRef(this.store, `${this.name}/${id}`); }
}
class FakeFirestore {
  store = new Map<string, Record<string, unknown>>();
  collection(name: string) { return new FakeQuery(this.store, name); }
  async runTransaction(callback: (transaction: {
    get: (ref: FakeRef) => Promise<FakeSnapshot>;
    create: (ref: FakeRef, value: Record<string, unknown>) => void;
    update: (ref: FakeRef, value: Record<string, unknown>) => void;
  }) => Promise<void>) {
    await callback({
      get: (ref) => ref.get(),
      create: (ref, value) => {
        if (this.store.has(ref.path)) throw Object.assign(new Error('exists'), { status: 409 });
        this.store.set(ref.path, value);
      },
      update: (ref, value) => {
        if (!this.store.has(ref.path)) throw new Error('missing');
        this.store.set(ref.path, { ...this.store.get(ref.path), ...value });
      },
    });
  }
}

const googleToken = (uid: string, overrides: Record<string, unknown> = {}) => ({
  uid, email: `${uid}@example.com`, name: uid, picture: `https://example.com/${uid}.png`,
  email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...overrides,
});
const adminRecord = (uid = 'admin'): StaffUser => ({
  uid, email: `${uid}@example.com`, displayName: 'Administrator', status: 'active',
  roles: ['administrator'], permissions: ['staff.portal.view', 'team.view', 'team.approve'],
  assignedSeriesIds: [], assignedSeasonIds: [], assignedEpisodeIds: [],
  createdAt: {}, createdBy: 'bootstrap', lastLoginAt: {},
});
const approval = {
  roles: ['editor'], permissions: ['staff.portal.view', 'books.view'],
  assignedSeriesIds: ['series-1'], assignedSeasonIds: ['season-1'],
  assignedEpisodeIds: ['episode-1'], reviewerNotes: 'Approved for editorial work.',
};

describe('staff Google access request and approval workflow', () => {
  let database: FakeFirestore;
  let server: Server;
  let baseUrl: string;
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(async () => {
    generatedId = 1;
    database = new FakeFirestore();
    const app = express();
    app.use(express.json());
    app.use('/api/staff', createStaffAccessRouter(
      database as never,
      async (raw) => {
        if (raw === 'anonymous') return googleToken('anonymous', { firebase: { sign_in_provider: 'anonymous' } }) as never;
        if (raw === 'fallback') return googleToken('google-browser-fallback-1') as never;
        return googleToken(raw) as never;
      },
    ));
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/api/staff`;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = null;
  });
  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    container.remove();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const api = (path: string, token: string, body?: unknown) => fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      'X-Staff-Session-Id': 'test-session',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const submit = (uid = 'candidate') => api('/access-request', uid, {
    requestedRole: 'editor', reason: 'I need access for editorial production.',
  });
  const renderGuard = async (phase: StaffAuthState['phase'], staffUser: StaffUser | null = null) => {
    const state: StaffAuthState = {
      phase, staffUser, firebaseUser: phase === 'unauthenticated' ? null : {} as never,
      accessRequest: null, error: null, refresh: vi.fn(),
    };
    root = createRoot(container);
    await act(async () => root?.render(
      <StaffAuthContext.Provider value={state}>
        <MemoryRouter initialEntries={['/staff/books']}>
          <Routes>
            <Route path="/staff/login" element={<div>LOGIN</div>} />
            <Route path="/staff/request-access" element={<div>REQUEST ACCESS</div>} />
            <Route path="/staff/pending" element={<div>PENDING</div>} />
            <Route path="/staff/access-rejected" element={<div>REJECTED</div>} />
            <Route path="/staff/suspended" element={<div>SUSPENDED</div>} />
            <Route path="/access-denied" element={<div>DENIED</div>} />
            <Route element={<RequireStaff />}><Route path="/staff/books" element={<div>STAFF BOOKS</div>} /></Route>
          </Routes>
        </MemoryRouter>
      </StaffAuthContext.Provider>,
    ));
    return container.textContent || '';
  };

  it('1. genuine Google user with an active staff record enters staff', async () => {
    expect(await renderGuard('authorized', adminRecord())).toContain('STAFF BOOKS');
  });
  it('2. user without a staff record sees the request-access route', async () => {
    expect(await renderGuard('request-needed')).toContain('REQUEST ACCESS');
  });
  it('3. candidate submits one pending request', async () => {
    expect((await submit()).status).toBe(201);
    expect(database.store.get('staffAccessRequests/candidate')?.status).toBe('pending');
    expect((await submit()).status).toBe(409);
  });
  it('candidate can cancel and resubmit the same request document', async () => {
    await submit();
    expect((await api('/access-request/cancel', 'candidate', {})).status).toBe(200);
    expect(database.store.get('staffAccessRequests/candidate')?.status).toBe('cancelled');
    expect([...database.store.values()].map((value) => value.action)).toContain('staff.access.cancelled');
    expect((await submit()).status).toBe(201);
    expect(database.store.get('staffAccessRequests/candidate')?.status).toBe('pending');
  });
  it('4. candidate cannot assign permissions', async () => {
    const response = await api('/access-request', 'candidate', {
      requestedRole: 'editor', reason: 'I need access for editorial production.',
      permissions: ['team.approve'],
    });
    expect(response.status).toBe(400);
    expect(database.store.has('staffAccessRequests/candidate')).toBe(false);
  });
  it('5. pending candidate cannot enter staff books', async () => {
    expect(await renderGuard('pending')).toContain('PENDING');
  });
  it('6. rejected candidate remains blocked', async () => {
    expect(await renderGuard('rejected')).toContain('REJECTED');
  });
  it('7. approved candidate enters after refresh resolves a staff record', async () => {
    expect(await renderGuard('authorized', { ...adminRecord('candidate'), roles: ['editor'] })).toContain('STAFF BOOKS');
  });
  it('8. suspended staff remains blocked', async () => {
    expect(await renderGuard('suspended', { ...adminRecord(), status: 'suspended' })).toContain('SUSPENDED');
  });
  it('9. anonymous user is rejected', async () => {
    expect((await api('/access-request/me', 'anonymous')).status).toBe(403);
  });
  it('10. browser-fallback identity is rejected', async () => {
    expect((await api('/access-request/me', 'fallback')).status).toBe(403);
  });
  it('11. non-admin staff cannot view access requests', async () => {
    database.store.set('staffUsers/staff', { ...adminRecord('staff'), permissions: ['team.view'] });
    expect((await api('/access-requests', 'staff')).status).toBe(403);
  });
  it('12. administrator with team.approve can view requests', async () => {
    database.store.set('staffUsers/admin', adminRecord() as never);
    await submit();
    const response = await api('/access-requests', 'admin');
    expect(response.status).toBe(200);
    expect((await response.json()).requests).toHaveLength(1);
  });
  it('13-16. approval creates staff with explicit access and audit events', async () => {
    database.store.set('staffUsers/admin', adminRecord() as never);
    await submit();
    const response = await api('/access-requests/candidate/approve', 'admin', approval);
    expect(response.status).toBe(200);
    expect(database.store.get('staffUsers/candidate')).toMatchObject({
      uid: 'candidate', status: 'active', roles: ['editor'],
      permissions: ['staff.portal.view', 'books.view'],
      assignedSeriesIds: ['series-1'],
    });
    const actions = [...database.store.values()].map((value) => value.action);
    expect(actions).toEqual(expect.arrayContaining([
      'staff.access.approved', 'staff.roles.assigned', 'staff.permissions.assigned',
    ]));
  });
  it('17. administrator can reject with notes', async () => {
    database.store.set('staffUsers/admin', adminRecord() as never);
    await submit();
    expect((await api('/access-requests/candidate/reject', 'admin', {
      reviewerNotes: 'The requested duties could not be verified.',
    })).status).toBe(200);
    expect(database.store.get('staffAccessRequests/candidate')).toMatchObject({
      status: 'rejected', reviewerNotes: 'The requested duties could not be verified.',
    });
  });
  it('18. candidate cannot approve themselves', async () => {
    database.store.set('staffUsers/candidate', adminRecord('candidate') as never);
    database.store.set('staffAccessRequests/candidate', {
      uid: 'candidate', status: 'pending', email: 'candidate@example.com', displayName: 'Candidate',
    });
    expect((await api('/access-requests/candidate/approve', 'candidate', approval)).status).toBe(403);
  });
  it('19. email alone does not grant administrator access', async () => {
    expect((await api('/access-requests', 'seigendc@gmail.com')).status).toBe(403);
  });
  it('20. public books routing remains outside staff authorization', () => {
    const source = String(requireStaffSource);
    expect(source).not.toContain('/books');
  });
  it('administrator route accepts team.manage as the alternate approval permission', async () => {
    const state = { ...adminRecord(), permissions: ['team.manage'] as StaffUser['permissions'] };
    root = createRoot(container);
    await act(async () => root?.render(
      <StaffAuthContext.Provider value={{ phase: 'authorized', firebaseUser: {} as never, staffUser: state, error: null, refresh: vi.fn() }}>
        <MemoryRouter><RequireAnyPermission permissions={['team.approve', 'team.manage']}><div>QUEUE</div></RequireAnyPermission></MemoryRouter>
      </StaffAuthContext.Provider>,
    ));
    expect(container.textContent).toContain('QUEUE');
  });
});

const requireStaffSource = RequireStaff;
