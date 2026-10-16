import type { PlayEvent } from './types';

export type EventDateFilter = 'all' | 'today' | 'tomorrow' | 'week';
const calendarDay = (instant: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(instant);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return Date.UTC(value('year'), value('month') - 1, value('day'));
};

/** Date chips refer to the calendar at the field, including across DST changes. */
export function matchesEventDate(event: Pick<PlayEvent, 'startAt' | 'timeZone'>, filter: EventDateFilter, now = Date.now()): boolean {
  if (filter === 'all') return true;
  const today = calendarDay(now, event.timeZone);
  const day = calendarDay(Date.parse(event.startAt), event.timeZone);
  if (filter === 'today') return day === today;
  if (filter === 'tomorrow') return day === today + 86_400_000;
  const daysToSunday = (7 - new Date(today).getUTCDay()) % 7;
  return day >= today && day <= today + daysToSunday * 86_400_000;
}
