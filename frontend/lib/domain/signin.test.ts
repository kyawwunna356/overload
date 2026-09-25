import { describe, expect, it } from 'vitest';
import {
  backupLabel,
  backupState,
  canPush,
  isCompleteCode,
  looksLikeEmail,
  normalizeCode,
  normalizeEmail,
} from './signin';

describe('email', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Me@Example.COM ')).toBe('me@example.com');
  });

  it('accepts plausible addresses and refuses the rest', () => {
    expect(looksLikeEmail('me@example.com')).toBe(true);
    expect(looksLikeEmail(' me@example.co.uk ')).toBe(true);
    for (const bad of ['', 'me', 'me@', '@example.com', 'me@example', 'me @example.com']) {
      expect(looksLikeEmail(bad)).toBe(false);
    }
  });
});

describe('code', () => {
  it('keeps digits only, so a pasted "123 456" works', () => {
    expect(normalizeCode('123 456')).toBe('123456');
    expect(normalizeCode('12-34a56')).toBe('123456');
  });

  it('stops at 10 digits', () => {
    expect(normalizeCode('1234567890123')).toBe('1234567890');
  });

  it('is complete from 6 digits', () => {
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345678')).toBe(true);
  });
});

describe('canPush', () => {
  it('lets anyone claim a phone with no owner', () => {
    expect(canPush(null, 'a')).toBe(true);
  });

  it('lets only the owner push', () => {
    expect(canPush('a', 'a')).toBe(true);
    expect(canPush('a', 'b')).toBe(false);
  });
});

describe('backup line', () => {
  const label = (signedIn: boolean, pending: number, ownerMismatch = false) =>
    backupLabel(backupState({ signedIn, pending, ownerMismatch }));

  it('invites a signed-out user to back up, whatever is waiting', () => {
    expect(label(false, 0)).toBe('Back up');
    expect(label(false, 12)).toBe('Back up');
  });

  it('says backed up only when nothing is waiting', () => {
    expect(label(true, 0)).toBe('Backed up');
  });

  it('counts waiting changes', () => {
    expect(label(true, 1)).toBe('1 change waiting');
    expect(label(true, 3)).toBe('3 changes waiting');
  });

  it('says paused when the phone belongs to another account', () => {
    expect(label(true, 0, true)).toBe('Backup paused');
    expect(label(true, 5, true)).toBe('Backup paused');
  });
});
