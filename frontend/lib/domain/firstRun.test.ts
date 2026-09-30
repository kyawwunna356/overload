import { describe, expect, it } from 'vitest';
import { INSTALL_SNOOZE_MS, firstRunStage, showBackupPrompt, showInstallCard } from './firstRun';

const NOW = 1_000 * INSTALL_SNOOZE_MS;

describe('firstRunStage', () => {
  it('welcomes a brand-new phone', () => {
    expect(firstRunStage(false, false)).toBe('welcome');
  });

  it('hints at the first set once something is picked', () => {
    expect(firstRunStage(true, false)).toBe('first-set');
  });

  it('says nothing once any set exists, picked or not', () => {
    expect(firstRunStage(true, true)).toBeNull();
    expect(firstRunStage(false, true)).toBeNull();
  });
});

describe('showInstallCard', () => {
  it('shows in a browser tab after the first set, never dismissed', () => {
    expect(showInstallCard(null, NOW, false, true)).toBe(true);
  });

  it('never shows in the installed app', () => {
    expect(showInstallCard(null, NOW, true, true)).toBe(false);
  });

  it('waits for the first set', () => {
    expect(showInstallCard(null, NOW, false, false)).toBe(false);
  });

  it('stays away for exactly a week after ✕', () => {
    expect(showInstallCard(NOW - INSTALL_SNOOZE_MS + 1, NOW, false, true)).toBe(false);
    expect(showInstallCard(NOW - INSTALL_SNOOZE_MS, NOW, false, true)).toBe(true);
  });
});

describe('showBackupPrompt', () => {
  it('asks a signed-out user after a finished session', () => {
    expect(showBackupPrompt({ kind: 'signed-out' }, true, false)).toBe(true);
  });

  it('waits until a session is over', () => {
    expect(showBackupPrompt({ kind: 'signed-out' }, false, false)).toBe(false);
  });

  it('never asks again after Not now', () => {
    expect(showBackupPrompt({ kind: 'signed-out' }, true, true)).toBe(false);
  });

  it('never asks when signed in, unconfigured, or still reading', () => {
    expect(showBackupPrompt({ kind: 'backed-up' }, true, false)).toBe(false);
    expect(showBackupPrompt({ kind: 'waiting', pending: 3 }, true, false)).toBe(false);
    expect(showBackupPrompt({ kind: 'paused' }, true, false)).toBe(false);
    expect(showBackupPrompt(null, true, false)).toBe(false);
    expect(showBackupPrompt(undefined, true, false)).toBe(false);
  });
});
