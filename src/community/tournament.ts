import type { Fixture, FixtureDiscipline, PlayEvent, TeamDiscipline } from './types';

const integer = (value: unknown, max = 99): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
const map = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function teamDiscipline(value: unknown): value is TeamDiscipline {
  return map(value) && Object.keys(value).length === 3 && integer(value.yellowCards, 64) && integer(value.redCards, 32) && integer(value.fouls, 199);
}
export function validDiscipline(value: unknown): value is FixtureDiscipline {
  return map(value) && Object.keys(value).length === 2 && teamDiscipline(value.home) && teamDiscipline(value.away);
}
export function validPenalties(fixture: { homeScore?: unknown; awayScore?: unknown; homePenalties?: unknown; awayPenalties?: unknown }, knockout: boolean): boolean {
  const hasPenalties = fixture.homePenalties !== undefined || fixture.awayPenalties !== undefined;
  if (!hasPenalties) return !knockout || fixture.homeScore === null || fixture.homeScore !== fixture.awayScore;
  return knockout && fixture.homeScore !== null && fixture.homeScore === fixture.awayScore && integer(fixture.homePenalties) && integer(fixture.awayPenalties) && fixture.homePenalties !== fixture.awayPenalties;
}
export function fixtureWinner(fixture: Fixture): string | null {
  if (!fixture.awayId) return fixture.homeId;
  if (fixture.homeScore === null || fixture.awayScore === null) return null;
  if (fixture.homeScore !== fixture.awayScore) return fixture.homeScore > fixture.awayScore ? fixture.homeId : fixture.awayId;
  if (!validPenalties(fixture, true)) return null;
  return fixture.homePenalties! > fixture.awayPenalties! ? fixture.homeId : fixture.awayId;
}
export function recordDiscipline(event: PlayEvent, fixtureId: string, input: FixtureDiscipline, now = Date.now()): Fixture[] {
  if (event.type !== 'tournament' || event.status !== 'closed') throw new Error('El acta solo se puede editar mientras el torneo está en curso.');
  const fixture = event.fixtures.find(item=>item.id === fixtureId);
  const kickoff = Date.parse(fixture?.startAt || event.startAt);
  if (!fixture?.awayId || fixture.homeScore === null || fixture.awayScore === null || !Number.isFinite(kickoff) || kickoff > now) throw new Error('Registra primero el resultado de un partido ya iniciado.');
  if (!validDiscipline(input)) throw new Error('Revisa las tarjetas y faltas: deben ser números enteros dentro de los límites indicados.');
  if (fixture.playerTotals && (['home','away'] as const).some(side=>(['yellowCards','redCards','fouls'] as const).some(key=>input[side][key] < fixture.playerTotals![side][key]))) throw new Error('El acta no puede quedar por debajo de las estadísticas de los jugadores.');
  const discipline = { home:{...input.home}, away:{...input.away} };
  return event.fixtures.map(item=>item.id === fixtureId ? {...item,discipline} : item);
}
export function disciplineTable(event: PlayEvent) {
  const table = Object.fromEntries(Object.entries(event.participants).map(([id,name])=>[id,{ id,name,reports:0,played:0,yellowCards:0,redCards:0,fouls:0 }]));
  for (const fixture of event.fixtures) {
    if (!fixture.awayId || fixture.homeScore === null || fixture.awayScore === null) continue;
    for (const [id,side] of [[fixture.homeId,'home'],[fixture.awayId,'away']] as const) {
      const row = table[id]; if (!row) continue;
      row.played++;
      if (validDiscipline(fixture.discipline)) { row.reports++; row.yellowCards += fixture.discipline[side].yellowCards; row.redCards += fixture.discipline[side].redCards; row.fouls += fixture.discipline[side].fouls; }
    }
  }
  return Object.values(table).sort((a,b)=>a.name.localeCompare(b.name,'es'));
}

export const emptyPlayerTotals = () => ({ goals:0, yellowCards:0, redCards:0, fouls:0 });
export function validPlayerStats(value: unknown): value is import('./types').FixturePlayerStats {
  return map(value) && typeof value.id === 'string' && ['home','away'].includes(String(value.side)) && integer(value.jersey) && integer(value.goals) && integer(value.yellowCards,2) && integer(value.redCards,1) && integer(value.fouls);
}
export function validPlayerTotals(value: unknown): value is NonNullable<Fixture['playerTotals']> {
  const side = (v:unknown) => map(v) && Object.keys(v).length === 4 && integer(v.goals) && integer(v.yellowCards,64) && integer(v.redCards,32) && integer(v.fouls,199);
  return map(value) && Object.keys(value).length === 2 && side(value.home) && side(value.away);
}
export function updatePlayerTotals(fixture: Fixture, previous: import('./types').FixturePlayerStats | null, next: import('./types').FixturePlayerStats) {
  if (!validPlayerStats(next) || previous && (!validPlayerStats(previous) || previous.side !== next.side || previous.jersey !== next.jersey)) throw new Error('Revisa el dorsal y las estadísticas del jugador.');
  if (fixture.homeScore === null || fixture.awayScore === null || !fixture.discipline) throw new Error('Guarda el resultado y el acta del equipo antes de añadir jugadores.');
  const totals = { home:{...emptyPlayerTotals(),...fixture.playerTotals?.home}, away:{...emptyPlayerTotals(),...fixture.playerTotals?.away} };
  for (const key of ['goals','yellowCards','redCards','fouls'] as const) totals[next.side][key] += next[key] - (previous?.[key] || 0);
  if (!validPlayerTotals(totals)) throw new Error('Las estadísticas acumuladas no son válidas.');
  for (const side of ['home','away'] as const) {
    if (totals[side].goals > (side === 'home' ? fixture.homeScore : fixture.awayScore) || (['yellowCards','redCards','fouls'] as const).some(key=>totals[side][key] > fixture.discipline![side][key])) throw new Error('La suma de los jugadores supera el marcador o el acta del equipo. Revisa primero los totales del partido.');
  }
  return totals;
}

export function consistentPlayerTotals(value: { playerTotals?:unknown; playerChangeId?:unknown; playerRevision?:unknown; discipline?:unknown; homeScore?:unknown; awayScore?:unknown }): boolean {
  if (value.playerTotals===undefined) return value.playerChangeId===undefined && value.playerRevision===undefined;
  if (!validPlayerTotals(value.playerTotals) || !validDiscipline(value.discipline) || !integer(value.homeScore) || !integer(value.awayScore) || !Number.isInteger(value.playerRevision) || Number(value.playerRevision)<1 || typeof value.playerChangeId!=='string' || !/^(home|away)_(0|[1-9][0-9]?)$/.test(value.playerChangeId)) return false;
  return (['home','away'] as const).every(side=>value.playerTotals[side].goals <= (side==='home'?value.homeScore:value.awayScore) && (['yellowCards','redCards','fouls'] as const).every(key=>value.playerTotals[side][key] <= value.discipline[side][key]));
}
