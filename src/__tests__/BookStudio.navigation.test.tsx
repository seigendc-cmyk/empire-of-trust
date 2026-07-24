import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book, ContentBlock } from '../types';

const mocks = vi.hoisted(() => ({
  saveBook: vi.fn(),
  deleteBook: vi.fn(),
  getBooks: vi.fn(),
  publishBook: vi.fn(),
  fetchBooks: vi.fn(),
  exportPdf: vi.fn(),
  retrySQLite: vi.fn(),
}));

vi.mock('../lib/sqlite', () => ({
  saveBookToSQLite: mocks.saveBook,
  deleteBookFromSQLite: mocks.deleteBook,
  getAllLocalBooks: mocks.getBooks,
  getSQLiteEngineState: () => ({
    status: 'healthy',
    error: null,
    attempts: 1,
    wasmUrl: '/assets/sql-wasm-test.wasm',
    sqliteVersion: '3.49.1',
  }),
  retrySQLiteInitialization: mocks.retrySQLite,
  subscribeSQLiteEngineState: (listener: (state: {
    status: string;
    error: null;
    attempts: number;
    wasmUrl: string;
    sqliteVersion: string;
  }) => void) => {
    listener({
      status: 'healthy',
      error: null,
      attempts: 1,
      wasmUrl: '/assets/sql-wasm-test.wasm',
      sqliteVersion: '3.49.1',
    });
    return () => undefined;
  },
}));

vi.mock('../lib/firebase', () => ({
  publishBookToFirestore: mocks.publishBook,
  fetchPublishedBooksFromFirestore: mocks.fetchBooks,
}));

vi.mock('../lib/pdfExporter', () => ({
  exportBookToPDF: mocks.exportPdf,
}));

vi.mock('../lib/accessCodes', () => ({
  generateRandomPopCode: () => 'POP-TEST',
  formatPublisherReplyMessage: () => 'reply',
  cleanPhoneNumber: (value: string) => value,
}));

vi.mock('../components/studio/DocumentEditor', () => ({
  DocumentEditor: ({
    blocks,
    onChangeBlocks,
  }: {
    blocks: ContentBlock[];
    onChangeBlocks: (blocks: ContentBlock[]) => void;
  }) => (
    <button
      type="button"
      id="test-edit-document"
      onClick={() => onChangeBlocks([...blocks, {
        id: 'block_changed',
        chapterId: 'chapter_1',
        type: 'paragraph',
        content: 'Changed',
        meta: {},
        orderIndex: blocks.length,
      }])}
    >
      Edit document
    </button>
  ),
}));

vi.mock('../components/studio/ChapterManager', () => ({
  ChapterManager: () => <div data-testid="content-panel">Content panel</div>,
}));

vi.mock('../components/studio/CoverEditor', () => ({
  CoverEditor: () => <div data-testid="covers-panel">Covers panel</div>,
}));

vi.mock('../components/studio/ReferencesEditor', () => ({
  ReferencesEditor: () => <div data-testid="references-panel">References panel</div>,
}));

vi.mock('../components/studio/VendorMarketingStudio', () => ({
  VendorMarketingStudio: () => <div data-testid="marketing-panel">Marketing panel</div>,
}));

vi.mock('../components/studio/BookNumberingModal', () => ({ BookNumberingModal: () => null }));
vi.mock('../components/studio/FrontMatterModal', () => ({ FrontMatterModal: () => null }));
vi.mock('../components/studio/BookSeriesModal', () => ({ BookSeriesModal: () => null }));
vi.mock('../components/studio/BookStructureModal', () => ({ BookStructureModal: () => null }));
vi.mock('../components/studio/AuthorContributorsModal', () => ({ AuthorContributorsModal: () => null }));
vi.mock('../components/studio/CharacterAssetModal', () => ({ CharacterAssetModal: () => null }));
vi.mock('../components/studio/ActivationDashboard', () => ({ ActivationDashboard: () => null }));

import { BookStudio } from '../components/studio/BookStudio';

const testBook: Book = {
  id: 'book_1',
  title: 'Navigation Test Book',
  subtitle: 'Studio navigation',
  author: 'Test Author',
  publisherId: 'publisher_1',
  description: 'Test description',
  category: 'General Non-Fiction',
  price: 10,
  currency: 'USD',
  isPublished: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  version: '1.0.0',
  coverFront: {
    title: 'Navigation Test Book',
    author: 'Test Author',
    bgType: 'gradient',
    bgColor: '#ea580c',
    gradientStart: '#ea580c',
    gradientEnd: '#9a3412',
    titleColor: '#ffffff',
    authorColor: '#fed7aa',
    layoutStyle: 'classic',
  },
  coverBack: {
    synopsis: 'Synopsis',
    publisherName: 'Test Publisher',
    bgColor: '#1f2125',
    textColor: '#ffffff',
  },
  chapters: [{
    id: 'chapter_1',
    bookId: 'book_1',
    title: 'Chapter 1',
    chapterNumber: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    blocks: [{
      id: 'block_1',
      chapterId: 'chapter_1',
      type: 'paragraph',
      content: 'Original',
      meta: {},
      orderIndex: 0,
    }],
  }],
  references: [],
};

let container: HTMLDivElement;
let root: Root;
let consoleError: ReturnType<typeof vi.spyOn>;

async function renderStudio(): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<BookStudio user={null} onOpenAuth={() => undefined} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(container.querySelector('#tab-content')).not.toBeNull();
}

function click(selector: string): void {
  const element = container.querySelector<HTMLButtonElement>(selector);
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.saveBook.mockReset().mockResolvedValue(undefined);
  mocks.deleteBook.mockReset().mockResolvedValue(undefined);
  mocks.getBooks.mockReset().mockResolvedValue([structuredClone(testBook)]);
  mocks.publishBook.mockReset().mockResolvedValue(undefined);
  mocks.fetchBooks.mockReset().mockResolvedValue([]);
  mocks.exportPdf.mockReset().mockResolvedValue(undefined);
  mocks.retrySQLite.mockReset().mockResolvedValue(undefined);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
  mocks.saveBook.mockResolvedValue(undefined);
  if (root) {
    await act(async () => root.unmount());
  }
  container?.remove();
  consoleError.mockRestore();
});

describe('BookStudio workspace navigation', () => {
  it('changes to Covers immediately even while the background flush is stalled, then reports rejection', async () => {
    let rejectSave: ((error: Error) => void) | undefined;
    mocks.saveBook.mockImplementation(() => new Promise<void>((_resolve, reject) => {
      rejectSave = reject;
    }));
    await renderStudio();

    act(() => click('#test-edit-document'));
    await act(async () => {
      click('#tab-covers');
      await vi.waitFor(() => expect(rejectSave).toBeTypeOf('function'));
    });

    expect(container.querySelector('[data-testid="covers-panel"]')).not.toBeNull();

    await act(async () => {
      rejectSave?.(new Error('SQLite unavailable'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Save failed');
    expect(consoleError).toHaveBeenCalledWith(
      'Book Studio save flush failed:',
      expect.any(Error),
    );
  });

  it('changes to References when the References button is clicked', async () => {
    await renderStudio();

    act(() => click('#tab-references'));
    expect(container.querySelector('[data-testid="references-panel"]')).not.toBeNull();
  });

  it('changes to Publish when the Publishing Studio button is clicked', async () => {
    await renderStudio();
    act(() => click('#tab-publish'));
    expect(container.textContent).toContain('Pricing, JSON Data Packs & Firebase Publishing');
  });

  it('changes to Marketing when the Vendor Marketing Studio button is clicked', async () => {
    await renderStudio();
    act(() => click('#tab-marketing'));
    expect(container.querySelector('[data-testid="marketing-panel"]')).not.toBeNull();
  });

  it('uses type=button for all five workspace navigation controls', async () => {
    await renderStudio();
    for (const id of ['tab-content', 'tab-covers', 'tab-references', 'tab-publish', 'tab-marketing']) {
      expect(container.querySelector<HTMLButtonElement>(`#${id}`)?.type).toBe('button');
    }
  });

  it('does not expose Series Studio inside the Book Builder route component', async () => {
    await renderStudio();
    expect(container.querySelector('#studio-series-btn')).toBeNull();
    expect(container.textContent).not.toContain('Series Book Studio');
  });

  it('keeps destructive deletion blocked when flushing pending changes fails', async () => {
    mocks.saveBook.mockRejectedValue(new Error('SQLite unavailable'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderStudio();

    act(() => click('#test-edit-document'));
    await act(async () => {
      click('button[title="Permanently delete this active book manuscript"]');
      await vi.waitFor(() => expect(mocks.saveBook).toHaveBeenCalled());
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(mocks.deleteBook).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
