import { describe, expect, it } from 'vitest';
import { formatInviteCode, newInviteCode, normalizeInviteCode } from './repo';

describe('invite codes', () => {
  it('are 8 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) expect(newInviteCode()).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  });

  it('are random', () => {
    const codes = new Set(Array.from({ length: 200 }, newInviteCode));
    expect(codes.size).toBe(200);
  });

  it('accept what people type', () => {
    expect(normalizeInviteCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeInviteCode(formatInviteCode('ABCDEFGH'))).toBe('ABCDEFGH');
    expect(formatInviteCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });
});
