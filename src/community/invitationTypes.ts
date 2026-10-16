export type InvitationKind = 'connection' | 'event';
export type InvitationStatus = 'active' | 'used' | 'revoked';

export interface CommunityInvitation {
  id: string;
  kind: InvitationKind;
  ownerId: string;
  eventId: string;
  status: InvitationStatus;
  createdAt: string;
  usedBy: string;
  usedAt: string;
}

export interface CommunityConnection {
  ownerId: string;
  peerId: string;
  inviteId: string;
  createdAt: string;
}

export type InvitationErrorCode = 'invalid-code' | 'unavailable' | 'signin-required' | 'email-verification-required' | 'self-invitation' | 'secure-random-unavailable';

export interface InvitationActor {
  userId: string;
  emailVerified: boolean;
  now?: number;
}
