export class PushTimeoutError extends Error {
  constructor(message: string) { super(message); this.name = 'PushTimeoutError'; }
}

// Bound native browser promises too: aborting fetch alone does not bound
// Firebase token refresh, PushManager or IndexedDB on a suspended iOS app.
export function withinPushDeadline<T>(task: PromiseLike<T>, milliseconds: number, message: string, cancel?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new PushTimeoutError(message));
      cancel?.();
    }, milliseconds);
  });
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}
