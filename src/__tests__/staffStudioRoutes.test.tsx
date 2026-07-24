import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StaffAuthContext, type StaffAuthState } from '../contexts/StaffAuthContext';
import type { StaffUser } from '../types/staff';

vi.mock('../components/portal/PublicPortal', () => ({ PublicPortal: () => <div>PUBLIC BOOK STORE</div> }));
vi.mock('../components/portal/PublicSeriesCatalogue', () => ({ PublicSeriesCatalogue: () => <div>PUBLIC SERIES</div> }));
vi.mock('../components/reader/ReaderShell', () => ({ ReaderShell: () => <div>OFFLINE MY LIBRARY</div> }));
vi.mock('../components/auth/GoogleAuthModal', () => ({ GoogleAuthModal: () => null }));
vi.mock('../components/pwa/PWAInstallPrompt', () => ({ PWAInstallPrompt: () => null }));
vi.mock('../components/routing/StudioRoutes', () => ({
  BookBuilderRoute: () => <div>BOOK BUILDER</div>,
  SeriesStudioRoute: () => <div>SERIES STUDIO</div>,
  InteractiveProductionRoute: () => <div>INTERACTIVE PRODUCTION CONSOLE</div>,
}));
vi.mock('../components/staff/StaffPages', () => ({
  StaffLoginPage: () => <div>STAFF LOGIN</div>,
  StaffAuthErrorPage: () => <div>STAFF AUTH ERROR</div>,
  StaffDashboardPage: () => <div>STAFF DASHBOARD</div>,
  StaffAuditLogPage: () => <div>STAFF AUDIT LOG</div>,
  StaffPlaceholderPage: ({ title }: { title: string }) => <div>{title}</div>,
  StatusPage: ({ title }: { title: string }) => <div>{title}</div>,
}));

import { AppRoutes } from '../App';

let container: HTMLDivElement;
let root: Root;
const staffUser: StaffUser = {
  uid: 'staff-1',
  email: 'staff@example.com',
  displayName: 'Staff One',
  status: 'active',
  roles: ['editor'],
  permissions: ['staff.portal.view', 'books.view', 'series.view', 'series.edit'],
  assignedSeriesIds: ['series-42'],
  assignedSeasonIds: [],
  assignedEpisodeIds: [],
  createdAt: {},
  createdBy: 'admin',
  lastLoginAt: {},
};
const authState = (authorized: boolean): StaffAuthState => authorized ? {
  phase: 'authorized',
  firebaseUser: { uid: staffUser.uid } as StaffAuthState['firebaseUser'],
  staffUser,
  error: null,
  refresh: async () => undefined,
} : {
  phase: 'unauthenticated',
  firebaseUser: null,
  staffUser: null,
  error: null,
  refresh: async () => undefined,
};

async function renderPath(path: string, authorized = true) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <StaffAuthContext.Provider value={authState(authorized)}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes
            user={null}
            directReadBook={null}
            directPackJson={null}
            isInstallable={false}
            isStandalone={false}
            onOpenReaderAuth={() => undefined}
            onOpenReaderWithBook={() => undefined}
            onInstall={() => undefined}
          />
        </MemoryRouter>
      </StaffAuthContext.Provider>,
    );
    await Promise.resolve();
  });
  await act(async () => { await Promise.resolve(); });
  return container;
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
});

describe('separate public and protected Studio URLs', () => {
  it('redirects / to /books', async () => expect((await renderPath('/')).textContent).toContain('PUBLIC BOOK STORE'));
  it('loads the public Book Store at /books', async () => expect((await renderPath('/books', false)).textContent).toContain('PUBLIC BOOK STORE'));
  it('loads public Series at /series', async () => expect((await renderPath('/series', false)).textContent).toContain('PUBLIC SERIES'));
  it('keeps the offline Reader at /my-library', async () => expect((await renderPath('/my-library', false)).textContent).toContain('OFFLINE MY LIBRARY'));
  it('does not show Studio navigation publicly', async () => {
    const view = await renderPath('/books', false);
    expect(view.textContent).not.toContain('Book Builder');
    expect(view.textContent).not.toContain('Series Production');
  });
  it('redirects unauthenticated staff access to /staff/login', async () => expect((await renderPath('/staff', false)).textContent).toContain('STAFF LOGIN'));
  it('loads Book Builder only at /staff/books', async () => expect((await renderPath('/staff/books')).textContent).toContain('BOOK BUILDER'));
  it('restores a direct Book Builder URL on refresh', async () => expect((await renderPath('/staff/books/book-42')).textContent).toContain('BOOK BUILDER'));
  it('loads Series Studio only at /staff/series', async () => expect((await renderPath('/staff/series')).textContent).toContain('SERIES STUDIO'));
  it('restores a selected Series Studio URL on refresh', async () => expect((await renderPath('/staff/series/series-42')).textContent).toContain('SERIES STUDIO'));
  it('loads the interactive console at its production URL', async () => expect((await renderPath('/staff/series/series-42/production')).textContent).toContain('INTERACTIVE PRODUCTION CONSOLE'));
  it('shows Books and Series Production in staff navigation', async () => {
    const view = await renderPath('/staff');
    expect(view.textContent).toContain('Books');
    expect(view.textContent).toContain('Series Production');
  });
  it('keeps component boundaries separated', () => {
    const bookStudio = readFileSync(join(process.cwd(),'src/components/studio/BookStudio.tsx'),'utf8');
    const seriesStudio = readFileSync(join(process.cwd(),'src/components/studio/SeriesBookStudio.tsx'),'utf8');
    expect(bookStudio).not.toContain("import { SeriesBookStudio }");
    expect(seriesStudio).not.toContain("import { InteractiveSeriesProductionStudio }");
  });
});
