import worker from './index.mjs';

// The HTTP API can run on Pages Functions with the same D1 database and
// VAPID keys. Scheduled retries remain on the existing Worker.
export default { fetch: worker.fetch };
