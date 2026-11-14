import test from 'node:test';
import assert from 'node:assert/strict';
import { eventSkillLevel, matchesSkillLevel } from '../src/community/skillLevels.ts';
import { normalizeEvent } from '../src/community/normalization.ts';
import { expandEventSeries, validateEvent, validateEventEdit } from '../src/community/logic.ts';
import { knownSharedSchema } from '../scripts/account-erasure-shared.mjs';
import { projectAccountEvent } from '../scripts/account-export.ts';
import type { PlayEvent, EventInput } from '../src/community/types.ts';

const event: PlayEvent = { id: 'skill-event', ownerId: 'owner', ownerName: 'Organización', title: 'Partido', visibility: 'private', type: 'match', format: '7', level: 'professional', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo', startAt: '2099-01-01T17:00:00.000Z', capacity: 14, entry: 'players', description: '', status: 'open', tournamentFormat: 'league', participants: {}, fixtures: [], createdAt: '2026-10-14T00:00:00.000Z' };

test('la categoría profesional histórica no implica nivel avanzado', () => {
  assert.equal(eventSkillLevel(event), 'any');
  assert.equal(normalizeEvent(event)?.skillLevel, undefined);
  assert.equal(matchesSkillLevel(event, 'advanced'), false);
  assert.equal(matchesSkillLevel(event, 'any'), true);
  assert.equal(matchesSkillLevel(event, 'all'), true);
});

test('nivel explícito sobrevive edición, recurrencia, exportación y reconocimiento para supresión', () => {
  for (const skillLevel of ['any', 'beginner', 'intermediate', 'advanced'] as const) {
    const input = { ...event, skillLevel };
    assert.equal(validateEvent(input).skillLevel, skillLevel);
    assert.equal(validateEventEdit(event, input, 'Aclarar nivel').skillLevel, skillLevel);
    assert.equal(normalizeEvent(input)?.skillLevel, skillLevel);
    assert.ok(expandEventSeries(input, 'weekly', 2).every(item => item.skillLevel === skillLevel));
    assert.equal(knownSharedSchema('communityEvents', input), true);
    const exported = projectAccountEvent({ id: event.id, path: `communityEvents/${event.id}`, data: input }, 'owner');
    assert.equal(exported?.skillLevel, skillLevel);
    assert.equal(exported?.level, 'professional');
    assert.equal(matchesSkillLevel(input, skillLevel), true);
    assert.equal(matchesSkillLevel(input, skillLevel === 'beginner' ? 'advanced' : 'beginner'), false);
  }
});

test('valores ajenos al catálogo se rechazan sin convertirlos en capacidad deportiva', () => {
  for (const skillLevel of [null, '', 'professional', 'expert', {}, 3]) {
    const input = { ...event, skillLevel } as unknown as EventInput;
    assert.throws(() => validateEvent(input), /inválido/);
    assert.equal(normalizeEvent(input), null);
    assert.equal(knownSharedSchema('communityEvents', input), false);
    assert.ok(!Object.hasOwn(projectAccountEvent({ id: event.id, path: `communityEvents/${event.id}`, data: input }, 'owner')!, 'skillLevel'));
  }
});
