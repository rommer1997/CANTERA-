import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

test('el esquema SQL se crea en una base vacía y aplica integridad, estados y borrado en cascada', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const folder = new URL('../migrations/', import.meta.url);
    for (const file of readdirSync(folder).filter(file => /^\d+_.+\.sql$/.test(file)).sort()) db.exec(readFileSync(new URL(file, folder), 'utf8'));
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(row => row.name), ['deliveries', 'rate_limits', 'subscriptions']);
    const delivery = db.prepare('INSERT INTO deliveries(id,subscription_id,actor_uid,recipient_uid,category,payload,next_at,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    assert.throws(() => delivery.run('orphan', 'missing', 'alice', 'bob', 'messages', '{}', 1, 2, 1), /FOREIGN KEY/);
    db.prepare('INSERT INTO subscriptions(id,uid,subscription_json,updated_at) VALUES (?,?,?,?)').run('device', 'bob', '{}', 1);
    assert.throws(() => db.prepare('UPDATE subscriptions SET messages=2').run(), /CHECK/);
    assert.throws(() => delivery.run('invalid', 'device', 'alice', 'bob', 'unknown', '{}', 1, 2, 1), /CHECK/);
    delivery.run('valid', 'device', 'alice', 'bob', 'messages', '{}', 1, 2, 1);
    assert.throws(() => db.prepare("UPDATE deliveries SET state='unknown' WHERE id='valid'").run(), /CHECK/);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    db.prepare('DELETE FROM subscriptions WHERE id=?').run('device');
    assert.equal(db.prepare('SELECT count(*) AS n FROM deliveries').get().n, 0);
  } finally { db.close(); }
});
