import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import he from '../i18n/he.json';
import { VOICE_LINES } from './voiceLines';

describe('voice lines', () => {
  it('every line has text in English and Hebrew, and nothing extra', () => {
    for (const lang of [en, he]) {
      expect(Object.keys(lang.voice).sort()).toEqual([...VOICE_LINES].sort());
      for (const id of VOICE_LINES) expect(lang.voice[id].trim().length).toBeGreaterThan(0);
    }
  });

  it('Hebrew has a vocalized (niqqud) version of every line, matching the display text', () => {
    expect(Object.keys(he.voiceTts).sort()).toEqual([...VOICE_LINES].sort());
    // Stripping niqqud and dagesh marks gives back the plain text (allowing
    // the usual extra yod/vav of unvocalized spelling, and abbreviations like
    // ט״ו written out for pronunciation).
    const strip = (s: string) =>
      s.normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/[יו״׳"']/g, '');
    for (const id of VOICE_LINES) {
      expect(he.voiceTts[id]).toMatch(/[ְ-ּ]/);
      expect(strip(he.voiceTts[id])).toBe(strip(he.voice[id]));
    }
  });

  it('has a direction line for every corner and a count for 3-2-1', () => {
    for (const c of ['TR', 'TL', 'BL', 'BR']) expect(VOICE_LINES).toContain(`corner_${c}`);
    for (const n of [1, 2, 3]) expect(VOICE_LINES).toContain(`count${n}`);
  });
});
