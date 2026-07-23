import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderView } from '../components/reader/ReaderView';
import type { Book } from '../types';

vi.mock('../lib/sqlite', () => ({
  addBookmarkSQLite: vi.fn(),
  getBookmarksSQLite: vi.fn().mockResolvedValue([]),
  addHighlightSQLite: vi.fn(),
  getHighlightsSQLite: vi.fn().mockResolvedValue([]),
  deleteHighlightSQLite: vi.fn(),
  saveQuizAttemptSQLite: vi.fn(),
  getQuizAttemptsSQLite: vi.fn().mockResolvedValue([]),
  deleteQuizAttemptsSQLite: vi.fn(),
}));

function readerBook(id: string, episodeNumber: number, title: string): Book {
  const timestamp = '2026-01-01T00:00:00.000Z';
  return {
    id,
    title,
    author: 'Series Author',
    publisherId: 'publisher',
    description: `${title} synopsis`,
    price: 0,
    currency: 'USD',
    coverFront: {
      title,
      author: 'Series Author',
      bgType: 'solid',
      bgColor: '#111111',
      titleColor: '#ffffff',
      authorColor: '#ffffff',
      layoutStyle: 'modern',
    },
    coverBack: { synopsis: `${title} synopsis`, bgColor: '#111111', textColor: '#ffffff' },
    chapters: [{
      id: `${id}-chapter`,
      bookId: id,
      title: 'Chapter One',
      chapterNumber: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      blocks: [],
    }],
    references: [],
    seriesConfig: {
      isSeries: true,
      seriesName: 'Trust Chronicles',
      seriesProjectId: 'series-1',
      seasonNumber: 1,
      episodeNumber,
      episodeTitle: title,
      previousEpisodeRecap: episodeNumber > 1 ? 'Previously, trust was broken.' : '',
      nextEpisodeTeaser: 'The conflict deepens.',
      nextEpisodeTitle: `Episode ${episodeNumber + 1}`,
      nextEpisodeReleaseDate: '2026-08-01',
    },
    isPublished: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: '1.0.0',
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Reader series integration', () => {
  it('renders safe series metadata, progress, recap, and available episode navigation', async () => {
    const first = readerBook('book-1', 1, 'The Beginning');
    const second = readerBook('book-2', 2, 'Broken Trust');
    const onOpen = vi.fn();
    await act(async () => {
      root.render(
        <ReaderView
          book={second}
          availableSeriesBooks={[first, second]}
          onOpenSeriesBook={onOpen}
          onBackToLibrary={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Series Progress');
    expect(container.textContent).toContain('2 of 2 available');
    expect(container.textContent).toContain('Previously, trust was broken.');
    const previous = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('The Beginning')
    );
    expect(previous).toBeTruthy();
    act(() => previous?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpen).toHaveBeenCalledWith(first);
  });

  it('shows a locked next episode and release date without private planning data', async () => {
    const first = readerBook('book-1', 1, 'The Beginning');
    await act(async () => {
      root.render(
        <ReaderView
          book={first}
          availableSeriesBooks={[first]}
          onBackToLibrary={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Episode 2');
    expect(container.textContent).toContain('Release schedule: 2026-08-01');
    expect(container.textContent?.toLowerCase()).not.toContain('private manuscript');
  });
});
