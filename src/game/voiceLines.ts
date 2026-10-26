// Every spoken line. Texts live in i18n (`voice.<id>`), and
// `npm run voice` turns them into clips.
export const VOICE_LINES = [
  'count3', 'count2', 'count1', 'go',
  'findFace', 'where', 'farther', 'aimHere', 'headStraight',
  'corner_TR', 'corner_TL', 'corner_BL', 'corner_BR',
  'halfway', 'yum1', 'yum2', 'yuck', 'celebrate', 'noCamera',
  // Brush by myself.
  'soloIntro', 'soloGo', 'soloWhere', 'soloNoCamera',
  'zone_TR', 'zone_TL', 'zone_BL', 'zone_BR',
  'surf_outside', 'surf_inside', 'surf_tops', 'tipFront', 'tongue', 'spit',
  // Holiday greetings, said after the celebration on the holiday.
  'hol_halloween', 'hol_hanukkah', 'hol_purim', 'hol_passover', 'hol_roshhashana', 'hol_sukkot',
  'hol_tubishvat', 'hol_independence', 'hol_lagbaomer', 'hol_shavuot', 'hol_newyear', 'hol_oralhealth',
  // Special moments.
  'birthday', 'toothFairy', 'dentist',
] as const;

export type VoiceLine = (typeof VOICE_LINES)[number];
