-- Sólo lecturas. No devuelve endpoints, claves de dispositivos, UIDs ni payloads.
SELECT name, sql FROM sqlite_schema
WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%';
PRAGMA foreign_key_check;
SELECT 'subscriptions' AS entity, count(*) AS total FROM subscriptions
UNION ALL SELECT 'deliveries', count(*) FROM deliveries
UNION ALL SELECT 'rate_limits', count(*) FROM rate_limits;
SELECT name, applied_at FROM d1_migrations ORDER BY id;
