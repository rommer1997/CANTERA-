export interface CommunityTeam {
  id: string; ownerId: string; name: string; country: string; city: string;
  description: string; level: 'amateur' | 'professional'; status: 'active' | 'archived';
  createdAt: string; updatedAt: string;
}
export interface TeamMember { id: string; teamId: string; userId: string; name: string; role: 'owner' | 'manager' | 'member'; joinedAt: string; }
export interface TeamInvite { id: string; teamId: string; createdBy: string; revoked: boolean; expiresAt: string; createdAt: string; }
export interface TeamJoinRequest { id: string; teamId: string; userId: string; name: string; inviteId: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; reviewedAt: string; }
export type TeamInput = Pick<CommunityTeam, 'name' | 'country' | 'city' | 'description' | 'level'>;
