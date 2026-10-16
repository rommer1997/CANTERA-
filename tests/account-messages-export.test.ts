import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAccountExport, type ExportRecord } from '../scripts/account-export.ts';

const message = (id: string, conversation: string, senderId = 'self', overrides = {}): ExportRecord => ({
  id, path: `communityConversations/${conversation}/messages/${id}`,
  data: { id, senderId, text: `Mensaje propio ${id}`, createdAt: new Date('2026-10-08T10:00:00Z'), ...overrides },
});
const exportMessages = (records: ExportRecord[]) => buildAccountExport({ uid: 'self', projectId: 'demo-cantera', databaseId: 'test', startedAt: '', completedAt: '', collections: { communityMessages: records } });

test('exporta mensajes propios con referencias de hilo sin UID ajeno, ruta, secretos o mensajes recibidos', () => {
  const rows = [message('a', 'PEER_SECRET:self', 'self', { token: 'TOKEN_SECRET' }), message('b', 'PEER_SECRET:self'), message('c', 'OTHER_SECRET:self'), message('received', 'PEER_SECRET:self', 'PEER_SECRET')];
  const result = exportMessages([...rows, rows[0]]);
  assert.equal(result.counts.communityMessages, 3);
  const a = result.collections.communityMessages.find(row => row.text === 'Mensaje propio a')!;
  const b = result.collections.communityMessages.find(row => row.text === 'Mensaje propio b')!;
  const c = result.collections.communityMessages.find(row => row.text === 'Mensaje propio c')!;
  assert.equal(a.conversationReference, b.conversationReference);
  assert.notEqual(a.conversationReference, c.conversationReference);
  assert.equal(a.createdAt, '2026-10-08T10:00:00.000Z');
  assert.equal(a.senderId, 'self');
  assert.equal(a.text, 'Mensaje propio a');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.ok(!JSON.stringify(result).includes('received'));
});

test('rechaza mensajes de otra ruta, participantes ajenos, IDs malformados y registros sin ruta comprobable', () => {
  const valid = message('a', 'other:self');
  const result = exportMessages([
    { ...valid, path: 'unrelated/other:self/messages/a' },
    message('b', 'other:third'), message('c', 'self:self'), message('d', 'other:self:third'),
    { ...valid, path: 'communityConversations/other:self/messages/wrong' },
    { id: valid.id, data: valid.data },
    valid,
  ]);
  assert.equal(result.counts.communityMessages, 1);
});

test('el titular superviviente exporta sólo su texto archivado sin ruta ni identidad de la cuenta retirada', () => {
  const archive = `archive_${'1'.repeat(32)}`;
  const result = exportMessages([message('own', archive), message('other', archive, 'another'), message('bad', 'archive_invalid')]);
  assert.equal(result.counts.communityMessages, 1);
  assert.equal(result.collections.communityMessages[0].text, 'Mensaje propio own');
  assert.equal(result.collections.communityMessages[0].senderId, 'self');
  assert.ok(!JSON.stringify(result).includes(archive));
});

test('exportación de lectura incluye marcador propio sin UID del contacto, rutas ni campos ajenos', () => {
  const own = { id: 'self:PEER_SECRET:self', path: 'communityMessageReads/self:PEER_SECRET:self', data: { userId: 'self', conversationId: 'PEER_SECRET:self', lastReadAt: new Date('2026-10-15T01:00:00Z'), lastReadMessageId: '0123456789abcdefghij', updatedAt: new Date('2026-10-15T01:00:01Z'), secret: 'SECRET_EXTRA' } };
  const other = { ...own, id: 'other:PEER_SECRET:other', path: 'communityMessageReads/other:PEER_SECRET:other', data: { ...own.data, userId: 'other' } };
  const result = buildAccountExport({ uid: 'self', projectId: 'demo-cantera', databaseId: 'test', startedAt: '', completedAt: '', collections: { communityMessageReads: [own, other] } });
  assert.equal(result.counts.communityMessageReads, 1);
  assert.equal(result.collections.communityMessageReads[0].lastReadAt, '2026-10-15T01:00:00.000Z');
  assert.equal(result.collections.communityMessageReads[0].exportReference, 'reading-1');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});
