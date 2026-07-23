import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebouncedSaveQueue, SaveStatus } from '../lib/debouncedSave';

afterEach(() => {
  vi.useRealTimers();
});

describe('DebouncedSaveQueue', () => {
  it('saves only the final state after rapid changes', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const queue = new DebouncedSaveQueue(save, { delayMs: 100 });

    queue.schedule('first');
    queue.schedule('second');
    queue.schedule('final');
    await vi.advanceTimersByTimeAsync(100);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('final');
    expect(queue.hasPendingSave).toBe(false);
  });

  it('keeps saves ordered and prevents overlap', async () => {
    const resolvers: Array<() => void> = [];
    const started: string[] = [];
    let activeSaves = 0;
    let maximumActiveSaves = 0;
    const queue = new DebouncedSaveQueue<string>((value) => {
      started.push(value);
      activeSaves += 1;
      maximumActiveSaves = Math.max(maximumActiveSaves, activeSaves);
      return new Promise<void>((resolve) => {
        resolvers.push(() => {
          activeSaves -= 1;
          resolve();
        });
      });
    });

    queue.schedule('first');
    const firstFlush = queue.flush();
    await Promise.resolve();
    queue.schedule('second');
    const secondFlush = queue.flush();
    await Promise.resolve();

    expect(started).toEqual(['first']);
    resolvers.shift()?.();
    await vi.waitFor(() => expect(started).toEqual(['first', 'second']));
    resolvers.shift()?.();
    await Promise.all([firstFlush, secondFlush]);
    expect(maximumActiveSaves).toBe(1);
  });

  it('flushes the current book before switching books', async () => {
    const saved: string[] = [];
    let finishFirstSave: (() => void) | undefined;
    const queue = new DebouncedSaveQueue<string>((value) => {
      saved.push(value);
      if (saved.length === 1) {
        return new Promise<void>((resolve) => {
          finishFirstSave = resolve;
        });
      }
      return Promise.resolve();
    });
    let activeBook = 'book-a';
    queue.schedule('book-a first state');

    const switchBook = queue.flush().then(() => {
      activeBook = 'book-b';
    });
    await vi.waitFor(() => expect(finishFirstSave).toBeTypeOf('function'));
    queue.schedule('book-a latest state');
    finishFirstSave?.();
    await switchBook;

    expect(saved).toEqual(['book-a first state', 'book-a latest state']);
    expect(activeBook).toBe('book-b');
  });

  it('reports a failed save and keeps the newest state retryable', async () => {
    const statuses: SaveStatus[] = [];
    const save = vi.fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);
    const queue = new DebouncedSaveQueue<string>(save, {
      onStatusChange: (status) => statuses.push(status),
    });
    queue.schedule('latest state');

    await expect(queue.flush()).rejects.toThrow('storage unavailable');
    expect(statuses.at(-1)).toBe('failed');
    expect(queue.hasPendingSave).toBe(true);

    await expect(queue.flush()).resolves.toBeUndefined();
    expect(save).toHaveBeenLastCalledWith('latest state');
    expect(statuses.at(-1)).toBe('saved');
  });

  it('triggers a best-effort flush on pagehide', async () => {
    const save = vi.fn(async () => undefined);
    const queue = new DebouncedSaveQueue<string>(save);
    queue.schedule('page state');
    const onPageHide = () => void queue.flush();
    window.addEventListener('pagehide', onPageHide);

    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    await Promise.resolve();
    await Promise.resolve();
    window.removeEventListener('pagehide', onPageHide);

    expect(save).toHaveBeenCalledWith('page state');
  });
});
