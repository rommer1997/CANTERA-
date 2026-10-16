import type { CommunityPost } from './types';

// This cache only holds local public media URLs, never account data.
export function createLocalMediaCache(read: (id: string) => Promise<Blob | null>, create: (blob: Blob) => string, revoke: (url: string) => void) {
  const urls = new Map<string, string>();
  const pending = new Map<string, { promise: Promise<string> }>();
  let disposed = false;
  const cached = (id: string) => urls.get(id) || '';
  function load(id: string): Promise<string> {
    if (disposed) return Promise.resolve('');
    if (urls.has(id)) return Promise.resolve(cached(id));
    const existing = pending.get(id);
    if (existing) return existing.promise;
    const job = { promise: Promise.resolve('') };
    job.promise = Promise.resolve().then(() => read(id)).then(blob => {
      if (disposed || pending.get(id) !== job || !(blob instanceof Blob)) return '';
      const url = create(blob); urls.set(id, url); return url;
    }).finally(() => { if (pending.get(id) === job) pending.delete(id); });
    pending.set(id, job);
    return job.promise;
  }
  function drop(id: string) {
    pending.delete(id);
    const url = urls.get(id); if (url) revoke(url);
    urls.delete(id);
  }
  function dispose() { disposed = true; pending.clear(); urls.forEach(revoke); urls.clear(); }
  return { cached, load, drop, dispose };
}

export function publishLocalPosts(posts: CommunityPost[], media: Pick<ReturnType<typeof createLocalMediaCache>, 'cached' | 'load'>, receive: (posts: CommunityPost[]) => void, receiveMedia: (post: CommunityPost, url: string) => void, isCurrent: () => boolean): Promise<void> {
  if (!isCurrent()) return Promise.resolve();
  // Text and account metadata must not wait for IndexedDB or large video blobs.
  receive(posts.map(post => post.mediaPath.startsWith('local:') ? { ...post, mediaUrl: media.cached(post.mediaPath.slice(6)) } : post));
  return Promise.all(posts.filter(post => post.mediaPath.startsWith('local:')).map(async post => {
    try {
      const url = await media.load(post.mediaPath.slice(6));
      if (url && isCurrent()) receiveMedia(post, url);
    } catch { /* A missing local file must not prevent the account or text loading. */ }
  })).then(() => undefined);
}
