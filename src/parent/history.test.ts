import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../data/types';
import { groupByDay, kindOf, monthGrid, monthRange, monthSummary } from './history';

const at = (day: number, hour: number) => Date.UTC(2026, 9, day, hour);
const s = (day: number, hour: number, extra: Partial<SessionRecord> = {}): SessionRecord => ({
  startedAt: at(day, hour),
  endedAt: at(day, hour),
  completed: true,
  perTarget: [],
  counted: true,
  pointsAwarded: 10,
  bonuses: [],
  ...extra,
});

describe('history calendar', () => {
  it('lays October 2026 out in Sunday-first weeks', () => {
    const grid = monthGrid(2026, 9);
    // Oct 1, 2026 is a Thursday: 4 empty cells first.
    expect(grid.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });

  it('month range covers exactly the month', () => {
    const [from, to] = monthRange(2026, 9);
    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(to).getMonth()).toBe(10);
  });

  it('groups by day and summarizes counted brushes only', () => {
    const sessions = [
      s(1, 7),
      s(1, 20, { manual: true, by: { uid: 'b', name: 'Bob' } }),
      s(2, 8, { noCamera: true }),
      s(2, 9, { counted: false, pointsAwarded: 0 }),
      s(3, 8, { completed: false, counted: false, pointsAwarded: 0 }),
    ];
    const byDay = groupByDay(sessions);
    expect(Object.keys(byDay)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(monthSummary(sessions)).toEqual({ brushes: 3, fullDays: 1, logged: 1, points: 30 });
    expect(sessions.map(kindOf)).toEqual(['app', 'manual', 'noCamera', 'app', 'app']);
  });
});
