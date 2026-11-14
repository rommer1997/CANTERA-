import type { PlayEvent, SkillLevel } from './types';

export const skillLevels: Record<SkillLevel, string> = {
  any: 'Todos los niveles', beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
};
export function isSkillLevel(value: unknown): value is SkillLevel {
  return typeof value === 'string' && Object.hasOwn(skillLevels, value);
}
export function eventSkillLevel(event: Pick<PlayEvent, 'skillLevel'>): SkillLevel {
  return isSkillLevel(event.skillLevel) ? event.skillLevel : 'any';
}
export function matchesSkillLevel(event: Pick<PlayEvent, 'skillLevel'>, filter: SkillLevel | 'all'): boolean {
  return filter === 'all' || eventSkillLevel(event) === filter;
}
