import type { RuntimeConfig } from './types';

export function validPilotUserIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 5
    && value.every(uid => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid))
    && new Set(value).size === value.length;
}

export interface PilotIdentity { uid: string; emailVerified: boolean; provider: string; }

export function pilotAccountAllowed(runtime: RuntimeConfig, identity: PilotIdentity | null): boolean {
  return runtime.serviceStatus === 'pilot' && validPilotUserIds(runtime.pilotUserIds)
    && identity?.emailVerified === true && identity.provider === 'google.com'
    && runtime.pilotUserIds.includes(identity.uid);
}
