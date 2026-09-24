import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FALLBACK_KIND,
  FALLBACK_PATTERN,
  readExercise,
  readRow,
  readSession,
  readSetLog,
  readTemplate,
  readTemplateItem,
} from './rows';
import { toLocal, toRemote } from './replica';
import { makeExercise, makeSet, without } from './test-utils';
import { SYNCED_TABLES } from './types';

// Every frozen fixture in ./fixtures. A future schema adds history-vN.json, and all of them
// must keep reading: this is the test that goes red if a change breaks old history.
const FIXTURE_DIR = join(__dirname, 'fixtures');
const fixtures = readdirSync(FIXTURE_DIR)
  .filter((name) => /^history-v\d+\.json$/.test(name))
  .map((name) => ({ name, data: JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8')) }));

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(data: unknown, table: string): Record<string, unknown>[] {
  const rows = isObject(data) ? data[table] : undefined;
  return Array.isArray(rows) ? rows.filter(isObject) : [];
}

describe('frozen history fixtures', () => {
  it('has at least the v1 fixture', () => {
    expect(fixtures.map((f) => f.name)).toContain('history-v1.json');
  });

  for (const { name, data } of fixtures) {
    for (const table of SYNCED_TABLES) {
      it(`${name}: every ${table} row reads, keeping each stored value`, () => {
        const rows = rowsOf(data, table);
        expect(rows.length).toBeGreaterThan(0);
        for (const raw of rows) {
          const read = readRow(table, raw);
          expect(read).not.toBeNull();
          // Nothing that was stored is lost or changed; only missing fields are added.
          expect(read).toMatchObject(raw);
        }
      });

      it(`${name}: every ${table} row survives a push and a pull unchanged`, () => {
        for (const raw of rowsOf(data, table)) {
          const read = readRow(table, raw);
          const remote = toRemote(table, raw, 'user-uuid');
          expect(remote).not.toBeNull();
          expect(toLocal(table, remote)).toEqual(read);
        }
      });
    }
  }

  it('v1 keeps every kind of set and bodyweight', () => {
    const v1 = fixtures.find((f) => f.name === 'history-v1.json');
    const sets = rowsOf(v1?.data, 'set_logs').map(readSetLog);
    expect(sets.map((s) => s?.kind)).toEqual(['warmup', 'working', 'drop', 'failure']);
    expect(sets.some((s) => s?.weight === 0)).toBe(true);
  });
});

describe('fields added later get a default on read', () => {
  it('a template item from before v3 gains user_id and updated_at', () => {
    const item = readTemplateItem({
      id: 'i1',
      template_id: 't1',
      exercise_id: 'e1',
      pattern: 'push',
      sort_order: 3,
    });
    expect(item).toEqual({
      id: 'i1',
      user_id: 'local',
      template_id: 't1',
      exercise_id: 'e1',
      pattern: 'push',
      sort_order: 3,
      updated_at: 0,
    });
  });

  it('a set with no updated_at uses its logged_at', () => {
    expect(readSetLog(without(makeSet({ logged_at: 5_000 }), 'updated_at'))?.updated_at).toBe(5_000);
  });

  it('a session with no ended_at is still running', () => {
    expect(readSession({ id: 's1', started_at: 10, updated_at: 10 })?.ended_at).toBeNull();
  });
});

describe('an unknown value never drops a row', () => {
  it('keeps a set whose kind a newer app invented', () => {
    const set = readSetLog({ ...makeSet(), kind: 'amrap' });
    expect(set).not.toBeNull();
    expect(set?.kind).toBe(FALLBACK_KIND);
  });

  it('keeps an exercise whose pattern a newer app invented', () => {
    const exercise = readExercise({ ...makeExercise(), pattern: 'carry' });
    expect(exercise?.pattern).toBe(FALLBACK_PATTERN);
  });

  it('keeps a set with a missing weight and reps as 0', () => {
    expect(readSetLog(without(makeSet(), 'weight', 'reps'))).toMatchObject({ weight: 0, reps: 0 });
  });

  it('ignores columns it does not know', () => {
    const set = makeSet();
    expect(readSetLog({ ...set, tempo: '3-1-1', notes: 'felt good' })).toEqual(set);
  });

  it('returns null only for a row with no identity', () => {
    expect(readSetLog({ ...makeSet(), id: undefined })).toBeNull();
    expect(readSetLog({ ...makeSet(), exercise_id: 7 })).toBeNull();
    expect(readSetLog({ ...makeSet(), logged_at: 'not a time' })).toBeNull();
    expect(readTemplate('a string')).toBeNull();
    expect(readExercise(null)).toBeNull();
    expect(readSession([1, 2])).toBeNull();
  });
});

describe('reading remote values', () => {
  it('reads ISO timestamps and numeric strings', () => {
    const set = readSetLog({
      id: 's1',
      exercise_id: 'e1',
      logged_at: '2026-09-12T17:00:00.000Z',
      updated_at: '2026-09-12T17:00:00.000Z',
      weight: '82.5',
      reps: 5,
      rpe: '8',
      kind: 'working',
      session_id: null,
    });
    expect(set).toMatchObject({
      logged_at: Date.parse('2026-09-12T17:00:00.000Z'),
      weight: 82.5,
      rpe: 8,
    });
  });
});
