// Calendar math and grouping for the brushing history.
import type { SessionRecord } from '../data/types';
import { dayKey } from '../rewards/dates';

export type BrushKind = 'app' | 'solo' | 'noCamera' | 'manual';

export const kindOf = (s: SessionRecord): BrushKind => (s.manual ? 'manual' : s.noCamera ? 'noCamera' : s.solo ? 'solo' : 'app');

/** Local-time [start, end) of a month (month is 0-based). */
export function monthRange(year: number, month: number): [number, number] {
  return [new Date(year, month, 1).getTime(), new Date(year, month + 1, 1).getTime()];
}

/**
 * Day keys for a month laid out in weeks starting on Sunday, with nulls
 * before the 1st and after the last day so every row has 7 cells.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(dayKey(new Date(year, month, d).getTime()));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function groupByDay(sessions: SessionRecord[]): Record<string, SessionRecord[]> {
  const out: Record<string, SessionRecord[]> = {};
  for (const s of sessions) (out[dayKey(s.endedAt)] ??= []).push(s);
  return out;
}

export function monthSummary(sessions: SessionRecord[]) {
  const counted = sessions.filter((s) => s.counted);
  const perDay = groupByDay(counted);
  return {
    brushes: counted.length,
    fullDays: Object.values(perDay).filter((d) => d.length >= 2).length,
    logged: counted.filter((s) => s.manual).length,
    points: counted.reduce((sum, s) => sum + s.pointsAwarded, 0),
  };
}
