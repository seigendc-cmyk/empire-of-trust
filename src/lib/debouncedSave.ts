export type SaveStatus = 'unsaved' | 'saving' | 'saved' | 'failed';

export interface DebouncedSaveOptions {
  delayMs?: number;
  onStatusChange?: (status: SaveStatus, error?: unknown) => void;
}

export class DebouncedSaveQueue<T> {
  private readonly delayMs: number;
  private readonly onStatusChange?: (status: SaveStatus, error?: unknown) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private latestValue: T | undefined;
  private latestRevision = 0;
  private requestedRevision = 0;
  private completedRevision = 0;
  private chain: Promise<void> = Promise.resolve();
  private reportStatus = true;

  constructor(
    private readonly save: (value: T) => Promise<void>,
    options: DebouncedSaveOptions = {}
  ) {
    this.delayMs = options.delayMs ?? 700;
    this.onStatusChange = options.onStatusChange;
  }

  get hasPendingSave(): boolean {
    return this.completedRevision < this.latestRevision;
  }

  schedule(value: T): void {
    this.latestValue = value;
    this.latestRevision += 1;
    this.notify('unsaved');
    this.clearTimer();
    this.timer = setTimeout(() => {
      void this.flush().catch(() => {
        // The status callback reports background save failures.
      });
    }, this.delayMs);
  }

  async flush(): Promise<void> {
    this.clearTimer();
    while (this.hasPendingSave) {
      const observedRevision = this.latestRevision;
      await this.enqueueLatest();
      this.clearTimer();
      if (this.latestRevision === observedRevision && !this.hasPendingSave) {
        return;
      }
    }
    await this.chain;
  }

  dispose(): Promise<void> {
    const operation = this.flush();
    this.reportStatus = false;
    return operation;
  }

  private enqueueLatest(): Promise<void> {
    if (this.latestValue === undefined || this.requestedRevision >= this.latestRevision) {
      return this.chain;
    }

    const value = this.latestValue;
    const revision = this.latestRevision;
    this.requestedRevision = revision;

    const operation = this.chain.catch(() => undefined).then(async () => {
      this.notify('saving');
      try {
        await this.save(value);
        this.completedRevision = Math.max(this.completedRevision, revision);
        this.notify(this.hasPendingSave ? 'unsaved' : 'saved');
      } catch (error) {
        if (this.requestedRevision === revision) {
          this.requestedRevision = revision - 1;
        }
        this.notify('failed', error);
        throw error;
      }
    });

    this.chain = operation;
    return operation;
  }

  private notify(status: SaveStatus, error?: unknown): void {
    if (this.reportStatus) {
      this.onStatusChange?.(status, error);
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
