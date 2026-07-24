import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffAuthContext, type StaffAuthState } from '../contexts/StaffAuthContext';
import { RequirePermission, RequireSeriesAssignment, RequireStaff } from '../components/routing/StaffGuards';
import type { StaffUser } from '../types/staff';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  auth: {
    currentUser: {
      uid: 'staff-1',
      getIdToken: vi.fn().mockResolvedValue('token'),
    },
  },
}));

vi.mock('../lib/firebase', () => ({
  auth: mocks.auth,
  db: {},
  logoutUser: vi.fn(),
}));
vi.mock('../components/portal/PublicPortal', () => ({ PublicPortal: () => <div>PUBLIC BOOKS</div> }));
vi.mock('../components/portal/PublicSeriesCatalogue', () => ({ PublicSeriesCatalogue: () => <div>PUBLIC SERIES</div> }));
vi.mock('../components/reader/ReaderShell', () => ({ ReaderShell: () => <div>OFFLINE MY LIBRARY</div> }));
vi.mock('../components/studio/BookStudio', () => ({ BookStudio: () => <div>STAFF STUDIO</div> }));
vi.mock('../components/auth/GoogleAuthModal', () => ({ GoogleAuthModal: () => null }));
vi.mock('../lib/sqlite', () => ({
  getSQLiteDB: vi.fn(), subscribeSQLiteEngineState: () => () => undefined,
}));

import { AppRoutes } from '../App';
import { createAuditDiff, writeStaffAuditLog } from '../lib/staffAudit';
import { isBrowserFallbackIdentity } from '../lib/staffAuth';
import { projectPublicBook } from '../lib/publicBookProjection';
import type { Book } from '../types';

const staff: StaffUser = {
  uid: 'staff-1', email: 'staff@example.com', displayName: 'Staff One', status: 'active',
  roles: ['editor'], permissions: ['staff.portal.view','books.view','series.view','series.edit','audit.view'],
  assignedSeriesIds: ['series-1'], assignedSeasonIds: [], assignedEpisodeIds: [],
  createdAt: {}, createdBy: 'admin', lastLoginAt: {},
};
const noop = async () => undefined;
const state = (overrides: Partial<StaffAuthState> = {}): StaffAuthState => ({
  phase: 'authorized', firebaseUser: { uid: 'staff-1' } as StaffAuthState['firebaseUser'],
  staffUser: staff, error: null, refresh: noop, ...overrides,
});

let container: HTMLDivElement;
let root: Root;
const render = async (node: React.ReactNode) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(node); await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  return container;
};
const GuardHarness: React.FC<{ authState: StaffAuthState; permission?: 'series.view' }> = ({ authState, permission }) => (
  <StaffAuthContext.Provider value={authState}>
    <MemoryRouter initialEntries={['/staff/series/series-1']}>
      <Routes>
        <Route path="/staff/login" element={<div>STAFF LOGIN</div>} />
        <Route path="/access-denied" element={<div>ACCESS DENIED</div>} />
        <Route path="/staff/suspended" element={<div>SUSPENDED</div>} />
        <Route path="/staff/forbidden" element={<div>FORBIDDEN</div>} />
        <Route element={<RequireStaff />}>
          <Route path="/staff/series/:seriesId" element={
            permission
              ? <RequirePermission permission={permission}><RequireSeriesAssignment><div>ALLOWED</div></RequireSeriesAssignment></RequirePermission>
              : <div>ALLOWED</div>
          } />
        </Route>
      </Routes>
    </MemoryRouter>
  </StaffAuthContext.Provider>
);

const app = (path: string, authState = state()) => (
  <StaffAuthContext.Provider value={authState}>
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes
        user={null} onOpenReaderAuth={() => undefined}
        onOpenReaderWithBook={() => undefined}
        directReadBook={null} directPackJson={null}
        isInstallable={false} isStandalone={false} onInstall={() => undefined}
      />
    </MemoryRouter>
  </StaffAuthContext.Provider>
);

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockReset().mockResolvedValue(new Response(JSON.stringify({
    id: 'audit-1', timestamp: 'server',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  sessionStorage.clear();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

describe('staff portal routing and authorization', () => {
  it('1. / redirects to /books', async () => expect((await render(app('/'))).textContent).toContain('PUBLIC BOOKS'));
  it('2. public user cannot see Studio link', async () => expect((await render(app('/books'))).textContent).not.toContain('Staff Studio'));
  it('3. public user cannot open /staff', async () => expect((await render(<GuardHarness authState={state({phase:'unauthenticated',firebaseUser:null,staffUser:null})}/>)).textContent).toContain('STAFF LOGIN'));
  it('4. reader fallback identity cannot access staff', () => expect(isBrowserFallbackIdentity('google-browser-fallback-123')).toBe(true));
  it('5. authenticated non-staff denied', async () => expect((await render(<GuardHarness authState={state({phase:'non-staff',staffUser:null})}/>)).textContent).toContain('ACCESS DENIED'));
  it('6. active staff allowed', async () => expect((await render(<GuardHarness authState={state()}/>)).textContent).toContain('ALLOWED'));
  it('7. suspended staff denied', async () => expect((await render(<GuardHarness authState={state({phase:'suspended'})}/>)).textContent).toContain('SUSPENDED'));
  it('8. permission guard', async () => expect((await render(<GuardHarness permission="series.view" authState={state({staffUser:{...staff,permissions:[]}})}/>)).textContent).toContain('FORBIDDEN'));
  it('9. series assignment guard', async () => expect((await render(<GuardHarness permission="series.view" authState={state({staffUser:{...staff,assignedSeriesIds:[]}})}/>)).textContent).toContain('FORBIDDEN'));
  it('9a. active staff without books.view is forbidden from Book Builder', async () => {
    const withoutBooks = {
      ...staff,
      permissions: staff.permissions.filter((permission) => permission !== 'books.view'),
    };
    const view = await render(
      <StaffAuthContext.Provider value={state({ staffUser: withoutBooks })}>
        <MemoryRouter initialEntries={['/staff/books']}>
          <Routes>
            <Route path="/staff/forbidden" element={<div>FORBIDDEN</div>} />
            <Route
              path="/staff/books"
              element={<RequirePermission permission="books.view"><div>BOOK BUILDER</div></RequirePermission>}
            />
          </Routes>
        </MemoryRouter>
      </StaffAuthContext.Provider>
    );
    expect(view.textContent).toContain('FORBIDDEN');
    expect(view.textContent).not.toContain('BOOK BUILDER');
  });
  it('10. direct route refresh', async () => expect((await render(app('/books/book-1'))).textContent).toContain('PUBLIC BOOKS'));
  it('11. public books route', async () => expect((await render(app('/books'))).textContent).toContain('PUBLIC BOOKS'));
  it('12. public series route', async () => expect((await render(app('/series'))).textContent).toContain('PUBLIC SERIES'));
  it('13. My Library route', async () => expect((await render(app('/my-library'))).textContent).toContain('OFFLINE MY LIBRARY'));
  it('14. staff login route', async () => expect((await render(app('/staff/login',state({phase:'unauthenticated',firebaseUser:null,staffUser:null})))).textContent).toContain('Staff sign in'));
});

describe('append-only staff audit contracts', () => {
  it('15. creates an audit event', async () => {
    await writeStaffAuditLog(staff, {
      action:'staff.role.change',entityType:'staff-user',entityId:'u2',hierarchy:{},
      changedFields:['roles'],reason:'Promotion',sessionId:'s',deviceId:'d',source:'staff-web',
      before:{roles:['viewer']},after:{roles:['editor']},
    });
    expect(mocks.fetch).toHaveBeenCalledWith('/api/staff/audit-logs', expect.objectContaining({method:'POST'}));
  });
  it('16. creates a before/after diff', () => expect(createAuditDiff({a:1,b:2},{a:1,b:3,c:4})).toEqual(['b','c']));
  it('17. delegates timestamp creation to the server', async () => {
    await writeStaffAuditLog(staff, {action:'x',entityType:'book',entityId:'b',hierarchy:{},changedFields:[],reason:'',sessionId:'s',deviceId:'d',source:'staff-web'});
    const body=JSON.parse(String(mocks.fetch.mock.calls[0][1].body));
    expect(body).not.toHaveProperty('timestamp');
  });
  it('18. audit log cannot be edited', () => expect(readFileSync(join(process.cwd(),'firestore.rules'),'utf8')).toMatch(/match \/staffAuditLogs\/\{eventId\}[\s\S]*allow create, update, delete: if false/));
  it('19. audit log cannot be deleted', () => expect(readFileSync(join(process.cwd(),'firestore.rules'),'utf8')).not.toMatch(/match \/staffAuditLogs\/\{eventId\}[\s\S]*allow delete: if true/));
  it('20. POP verification is audited', () => expect(readFileSync(join(process.cwd(),'src/lib/publicDistributionFirestore.ts'),'utf8')).toContain('/api/pop-review'));
  it('21. publishing is audited', () => expect(readFileSync(join(process.cwd(),'src/lib/publicDistributionFirestore.ts'),'utf8')).toContain('/api/staff/publishing'));
  it('22. staff role change can use the centralized audit writer', async () => {
    await writeStaffAuditLog(staff, {action:'staff.role.change',entityType:'staff-user',entityId:'u2',hierarchy:{},changedFields:['roles'],reason:'Approved',sessionId:'s',deviceId:'d',source:'staff-web'});
    expect(JSON.parse(String(mocks.fetch.mock.calls[0][1].body)).action).toBe('staff.role.change');
  });
  it('23. failed login is audited', () => expect(readFileSync(join(process.cwd(),'src/lib/staffAuth.ts'),'utf8')).toContain("recordAuthEvent('login-failure'"));
  it('24. offline My Library still opens without staff', async () => expect((await render(app('/my-library'))).textContent).toContain('OFFLINE MY LIBRARY'));
  it('25. public projection excludes private Studio data', () => {
    const book = {
      id:'b',title:'Public',author:'A',publisherId:'p',description:'D',price:1,currency:'USD',
      coverFront:{},coverBack:{synopsis:'S',publisherName:'P',bgColor:'#fff',textColor:'#000'},
      chapters:[{id:'secret'}],references:[{id:'secret'}],characters:[{id:'secret'}],
      assets:[{id:'secret'}],accessCodes:['SECRET'],isPublished:false,
      createdAt:'2026-01-01',updatedAt:'2026-01-01',version:'1',
    } as unknown as Book;
    const projection=projectPublicBook(book) as Book & Record<string,unknown>;
    expect(projection.chapters).toEqual([]);
    expect(projection.references).toEqual([]);
    expect(projection).not.toHaveProperty('characters');
    expect(projection).not.toHaveProperty('assets');
    expect(projection).not.toHaveProperty('accessCodes');
  });
});
