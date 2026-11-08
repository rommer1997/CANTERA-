import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECT_INVITATION_TTL_MS, INVITATION_TTL_MS, invitationExpiresAt, normalizeInvitation, validateInvitationAcceptance } from '../src/community/invitations.ts';
const at='2026-11-08T12:00:00.000Z';
const invite={id:'23456789ABCDEFGH',kind:'event' as const,ownerId:'alice',recipientId:'bob',eventId:'private',status:'active' as const,createdAt:at,usedAt:'',usedBy:''};
test('invitación directa se limita a su destinatario y caduca a los siete días; QR mantiene diez minutos',()=>{
  assert.equal(DIRECT_INVITATION_TTL_MS,7*86400000);assert.equal(INVITATION_TTL_MS,600000);
  assert.equal(invitationExpiresAt(at,true),'2026-11-15T12:00:00.000Z');
  assert.equal(invitationExpiresAt(at),'2026-11-08T12:10:00.000Z');
  validateInvitationAcceptance(invite,{userId:'bob',emailVerified:true,now:Date.parse(at)+86400000});
  assert.throws(()=>validateInvitationAcceptance(invite,{userId:'carol',emailVerified:true,now:Date.parse(at)+1}));
  assert.throws(()=>validateInvitationAcceptance(invite,{userId:'bob',emailVerified:true,now:Date.parse(at)+7*86400000}));
});
test('una directa no puede consumirse con otra cuenta, dirigirse al creador ni extender un QR de conexión',()=>{
  assert.ok(normalizeInvitation(invite));
  assert.equal(normalizeInvitation({...invite,recipientId:'alice'}),null);
  assert.equal(normalizeInvitation({...invite,kind:'connection',eventId:''}),null);
  assert.equal(normalizeInvitation({...invite,status:'used',usedBy:'carol',usedAt:'2026-11-08T12:01:00.000Z'}),null);
  assert.ok(normalizeInvitation({...invite,status:'used',usedBy:'bob',usedAt:'2026-11-09T12:00:00.000Z'}));
  assert.ok(normalizeInvitation({...invite,status:'declined'}));
  assert.equal(normalizeInvitation({...invite,recipientId:undefined,status:'declined'}),null);
});
