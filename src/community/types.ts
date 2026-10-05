export type Level = 'amateur' | 'professional';
export type PostKind = 'reel' | 'photo' | 'achievement';
export interface CommunityProfile {
  id: string;
  name: string;
  bio: string;
  city: string;
  country: string;
  position: string;
  team: string;
  level: Level;
  adultConfirmed: boolean;
  verification: 'unverified' | 'verified';
  entityType: 'individual' | 'group' | 'club';
  createdAt: string;
  acceptedTermsVersion: string;
  acceptedTermsAt: string;
}
export interface Fixture {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
}
export interface PlayEvent {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  type: 'match' | 'tournament';
  format: '5' | '7' | '11';
  level: Level;
  city: string;
  country: string;
  timeZone: string;
  venue: string;
  startAt: string;
  startAtMs?: number;
  capacity: number;
  entry: 'players' | 'teams';
  description: string;
  status: 'open' | 'closed' | 'cancelled';
  tournamentFormat: 'league' | 'knockout';
  participants: Record<string, string>;
  fixtures: Fixture[];
  createdAt: string;
}
export type EventInput = Omit<PlayEvent, 'id' | 'ownerId' | 'ownerName' | 'status' | 'participants' | 'fixtures' | 'createdAt'>;
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  kind: PostKind;
  text: string;
  title: string;
  mediaUrl: string;
  mediaPath: string;
  createdAt: string;
  eventId: string;
}
export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}
export interface PostInput {
  kind: PostKind;
  text: string;
  title: string;
  eventId: string;
  file?: File;
}
export interface Standing {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}
export interface VerificationRequest {
  id: string;
  userId: string;
  name: string;
  organization: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string;
}
export interface ContentReport {
  id: string;
  reporterId: string;
  postId: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
}
