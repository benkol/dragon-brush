// Holidays and seasons. Shop windows (SEASONS) decide when seasonal items
// are on sale; HOLIDAYS are the actual days, for double points, greetings
// and costumes. Jewish holidays follow the Hebrew calendar (via Intl), so
// they move with it every year.
import type { Equipped } from '../data/types';

export type Season =
  | 'halloween'
  | 'hanukkah'
  | 'purim'
  | 'passover'
  | 'roshhashana'
  | 'sukkot'
  | 'tubishvat'
  | 'lagbaomer'
  | 'independence'
  | 'shavuot'
  | 'summer'
  | 'winter'
  | 'newyear';

type GregorianWindow = { gregorian: [[number, number], [number, number]] };
type HebrewWindow = { hebrew: [[string, number], [string, number]] };

/** [month, day] start and end, inclusive. Starts a little before the holiday so there's time to buy. */
export const SEASONS: Record<Season, GregorianWindow | HebrewWindow> = {
  halloween: { gregorian: [[10, 15], [11, 2]] },
  hanukkah: { hebrew: [['Kislev', 15], ['Tevet', 3]] },
  purim: { hebrew: [['Adar', 1], ['Adar', 16]] },
  passover: { hebrew: [['Nisan', 1], ['Nisan', 22]] },
  roshhashana: { hebrew: [['Elul', 20], ['Tishri', 10]] },
  sukkot: { hebrew: [['Tishri', 11], ['Tishri', 23]] },
  tubishvat: { hebrew: [['Shevat', 8], ['Shevat', 16]] },
  independence: { hebrew: [['Iyar', 1], ['Iyar', 7]] },
  lagbaomer: { hebrew: [['Iyar', 10], ['Iyar', 19]] },
  shavuot: { hebrew: [['Sivan', 1], ['Sivan', 7]] },
  summer: { gregorian: [[6, 21], [8, 31]] },
  winter: { gregorian: [[12, 15], [2, 28]] },
  newyear: { gregorian: [[12, 26], [1, 3]] },
};

export const SEASON_EMOJI: Record<Season, string> = {
  halloween: '🎃',
  hanukkah: '🕎',
  purim: '🎭',
  passover: '🍷',
  roshhashana: '🍎',
  sukkot: '🌿',
  tubishvat: '🌳',
  independence: '🇮🇱',
  lagbaomer: '🔥',
  shavuot: '🌸',
  summer: '☀️',
  winter: '❄️',
  newyear: '🎆',
};

// Hebrew year order. In leap years Purim is in Adar II, so it maps to "Adar"
// and Adar I sits before it.
const HEBREW_MONTHS = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar I', 'Adar', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];

let hebrewFmt: Intl.DateTimeFormat | null = null;

/** Hebrew [month name, day] for a local date. */
export function hebrewDate(d: Date): [string, number] {
  hebrewFmt ??= new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' });
  const parts = hebrewFmt.formatToParts(d);
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = Number(parts.find((p) => p.type === 'day')!.value);
  return [month === 'Adar II' ? 'Adar' : month, day];
}

/** Is (m, d) within [start, end], where the window may wrap past the end of the year? */
function within<T>(order: (m: T) => number, cur: [T, number], start: [T, number], end: [T, number]) {
  const v = (x: [T, number]) => order(x[0]) * 100 + x[1];
  const [c, s, e] = [v(cur), v(start), v(end)];
  return s <= e ? c >= s && c <= e : c >= s || c <= e;
}

export function inSeason(season: Season, ms: number): boolean {
  const w = SEASONS[season];
  const d = new Date(ms);
  if ('gregorian' in w) return within((m: number) => m, [d.getMonth() + 1, d.getDate()], w.gregorian[0], w.gregorian[1]);
  return within((m: string) => HEBREW_MONTHS.indexOf(m), hebrewDate(d), w.hebrew[0], w.hebrew[1]);
}

export function currentSeasons(ms: number): Season[] {
  return (Object.keys(SEASONS) as Season[]).filter((s) => inSeason(s, ms));
}

// ---------------------------------------------------------------------------
// Holiday days

export type Holiday =
  | 'halloween'
  | 'hanukkah'
  | 'purim'
  | 'passover'
  | 'roshhashana'
  | 'sukkot'
  | 'tubishvat'
  | 'independence'
  | 'lagbaomer'
  | 'shavuot'
  | 'newyear'
  | 'oralhealth';

interface HolidayDef {
  /** First day: [month, day], Gregorian month number or Hebrew month name. */
  start: { gregorian: [number, number] } | { hebrew: [string, number] };
  /** How many days it lasts (greetings and costumes all days; double points on the first). */
  days: number;
}

export const HOLIDAYS: Record<Holiday, HolidayDef> = {
  halloween: { start: { gregorian: [10, 31] }, days: 1 },
  newyear: { start: { gregorian: [12, 31] }, days: 2 },
  oralhealth: { start: { gregorian: [3, 20] }, days: 1 },
  hanukkah: { start: { hebrew: ['Kislev', 25] }, days: 8 },
  purim: { start: { hebrew: ['Adar', 14] }, days: 2 },
  passover: { start: { hebrew: ['Nisan', 15] }, days: 7 },
  roshhashana: { start: { hebrew: ['Tishri', 1] }, days: 2 },
  sukkot: { start: { hebrew: ['Tishri', 15] }, days: 8 },
  tubishvat: { start: { hebrew: ['Shevat', 15] }, days: 1 },
  // The official date shifts by a day when 5 Iyar falls near Shabbat.
  independence: { start: { hebrew: ['Iyar', 5] }, days: 1 },
  lagbaomer: { start: { hebrew: ['Iyar', 18] }, days: 1 },
  shavuot: { start: { hebrew: ['Sivan', 6] }, days: 1 },
};

export const HOLIDAY_EMOJI: Record<Holiday, string> = {
  halloween: '🎃',
  hanukkah: '🕎',
  purim: '🎭',
  passover: '🍷',
  roshhashana: '🍎',
  sukkot: '🌿',
  tubishvat: '🌳',
  independence: '🇮🇱',
  lagbaomer: '🔥',
  shavuot: '🌸',
  newyear: '🎆',
  oralhealth: '🦷',
};

function isStartDay(def: HolidayDef, d: Date) {
  if ('gregorian' in def.start) return d.getMonth() + 1 === def.start.gregorian[0] && d.getDate() === def.start.gregorian[1];
  const [m, day] = hebrewDate(d);
  return m === def.start.hebrew[0] && day === def.start.hebrew[1];
}

/** The holiday happening today, if any, and which day of it (0 = first). */
export function holidayToday(ms: number): { holiday: Holiday; day: number } | null {
  for (const [holiday, def] of Object.entries(HOLIDAYS) as [Holiday, HolidayDef][]) {
    for (let i = 0; i < def.days; i++) {
      const d = new Date(ms);
      d.setDate(d.getDate() - i);
      if (isStartDay(def, d)) return { holiday, day: i };
    }
  }
  return null;
}

/** Holiday outfits the dragon wears for the day, only in slots the kid left empty. */
const COSTUMES: Partial<Record<Holiday, Partial<Equipped>>> = {
  halloween: { hat: 'hat.witch' },
  hanukkah: { hat: 'hat.dreidel' },
  purim: { glasses: 'glasses.mask' },
  sukkot: { hat: 'hat.flag' },
  tubishvat: { hat: 'hat.leaves' },
  independence: { hat: 'hat.hammer' },
  shavuot: { hat: 'hat.flowers' },
  newyear: { glasses: 'glasses.newyear' },
};

export function withCostume(equipped: Equipped, ms: number, birthday?: string | null): Equipped {
  const costume: Partial<Equipped> = birthdayWeekYear(birthday, ms) !== null ? { hat: 'hat.birthday' } : COSTUMES[holidayToday(ms)?.holiday as Holiday] ?? {};
  const out = { ...equipped };
  for (const [slot, id] of Object.entries(costume) as [keyof Equipped, string][]) {
    if (out[slot].endsWith('.none')) out[slot] = id;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Birthdays and anniversaries

export const BIRTHDAY_WEEK_DAYS = 7;

/**
 * If `ms` falls in the week starting on this date's anniversary (the day and
 * the 6 after), the year of that anniversary; otherwise null. `date` is
 * YYYY-MM-DD (only month and day matter). Feb 29 counts as Feb 28 in other
 * years. Used for birthdays and brushing anniversaries.
 */
export function birthdayWeekYear(date: string | null | undefined, ms: number): number | null {
  if (!date) return null;
  const [, m, d] = date.split('-').map(Number);
  if (!m || !d) return null;
  const now = new Date(ms);
  for (const year of [now.getFullYear(), now.getFullYear() - 1]) {
    const leap = new Date(year, 1, 29).getMonth() === 1;
    const start = new Date(year, m - 1, m === 2 && d === 29 && !leap ? 28 : d);
    const end = new Date(start);
    end.setDate(end.getDate() + BIRTHDAY_WEEK_DAYS);
    if (now >= start && now < end) return year;
  }
  return null;
}
