export interface CoalescedRefresh {
  refresh(): void;
  dispose(): void;
}

/** Coalesce a burst, then retain one pending refresh while the task is running. */
export function createCoalescedRefresh(
  taskAsync: () => Promise<unknown>,
  onError?: (error: unknown) => void | Promise<void>,
): CoalescedRefresh {
  let disposed = false;
  let queued = false;
  let running = false;
  let pending = false;

  function schedule() {
    if (disposed || queued || running) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (disposed || !pending) return;
      pending = false;
      running = true;
      void run();
    });
  }

  async function run() {
    try {
      await taskAsync();
    } catch (error) {
      if (!disposed && onError) {
        try { await onError(error); }
        catch { /* An error handler must not stall future refreshes. */ }
      }
    } finally {
      running = false;
      if (pending && !disposed) schedule();
    }
  }

  return {
    refresh() {
      if (disposed) return;
      pending = true;
      schedule();
    },
    dispose() {
      disposed = true;
      pending = false;
    },
  };
}
