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
export type PublicProfile = Pick<CommunityProfile, 'id' | 'name' | 'bio' | 'city' | 'country' | 'position' | 'team' | 'level' | 'verification' | 'entityType' | 'createdAt'>;
export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}
export type Rsvp = 'yes' | 'no' | 'maybe';
export interface EventChange { revision: number; changedAt: string; summary: string; }
export interface MatchResult { homeName: string; awayName: string; homeScore: number; awayScore: number; }
export interface FixtureSchedule { startAt: string; timeZone: string; venue: string; }
export interface AccountModeration { status: 'active' | 'suspended'; reason: string; updatedAt: string; }
export interface RuntimeConfig { serviceStatus: 'setup' | 'open' | 'paused' | 'pilot'; mediaUploadsEnabled: boolean; contactEmail: string; updatedAt: string; pilotUserIds?: string[]; }
export interface EventNotice { id: string; eventId: string; recipientId: string; revision: number; title: string; summary: string; createdAt: string; readAt: string; kind?: 'change' | 'place'; deliveryId?: string; }
export interface RightsRequest { id: string; userId: string; kind: 'export' | 'delete'; status: 'pending' | 'processing' | 'completed' | 'rejected'; createdAt: string; reviewedAt: string; }
export interface PostInteractionState { loading: boolean; error: string; hasMoreComments: boolean; likesCount: number; commentsCount: number; }
export type PeopleSearchField = 'name' | 'city' | 'country';
export interface Fixture {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  startAt?: string;
  timeZone?: string;
  venue?: string;
}
export interface PlayEvent {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  visibility?: 'public' | 'private';
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
  status: 'open' | 'closed' | 'cancelled' | 'completed';
  tournamentFormat: 'league' | 'knockout';
  participants: Record<string, string>;
  fixtures: Fixture[];
  fixtureIds?: string[];
  createdAt: string;
  revision?: number;
  updatedAt?: string;
  history?: EventChange[];
  rsvps?: Record<string, Rsvp>;
  waitlist?: Record<string, { name: string; joinedAt: string }>;
  waitlistOrder?: string[];
  participantIds?: string[];
  result?: MatchResult;
  teamId?: string;
}
export type EventInput = Omit<PlayEvent, 'id' | 'ownerId' | 'ownerName' | 'status' | 'participants' | 'fixtures' | 'createdAt' | 'revision' | 'updatedAt' | 'history' | 'rsvps' | 'waitlist' | 'waitlistOrder' | 'participantIds' | 'result' | 'fixtureIds'>;
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
  commentId?: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
}
