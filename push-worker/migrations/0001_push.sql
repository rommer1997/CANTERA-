PRAGMA foreign_keys = ON;
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  subscription_json TEXT NOT NULL,
  messages INTEGER NOT NULL DEFAULT 1 CHECK(messages IN (0,1)),
  invitations INTEGER NOT NULL DEFAULT 1 CHECK(invitations IN (0,1)),
  updated_at INTEGER NOT NULL
);
CREATE INDEX subscriptions_owner ON subscriptions(uid,updated_at);
CREATE INDEX subscriptions_expiry ON subscriptions(updated_at);
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  actor_uid TEXT NOT NULL,
  recipient_uid TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('messages','invitations')),
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX deliveries_pending ON deliveries(state,next_at,lease_until);
CREATE INDEX deliveries_recipient ON deliveries(recipient_uid,actor_uid);
CREATE INDEX deliveries_expiry ON deliveries(expires_at);
CREATE TABLE rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
