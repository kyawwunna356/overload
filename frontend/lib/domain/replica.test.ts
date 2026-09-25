import { describe, expect, it } from 'vitest';
import {
  newerWins,
  pushBatches,
  seededSetIds,
  toLocal,
  toRemote,
  unqueuedRows,
} from './replica';
import { makeExercise, makeSet, without } from './test-utils';
import type { OutboxRow, Session, SyncedRow, SyncedTable, Template, TemplateItem } from './types';

const template: Template = {
  id: 't1',
  user_id: 'local',
  name: 'My Exercises',
  is_default: true,
  updated_at: 1_700_000_000_000,
};

const item: TemplateItem = {
  id: 'i1',
  user_id: 'local',
  template_id: 't1',
  exercise_id: 'ex-Exercise',
  pattern: 'squat',
  sort_order: 2,
  updated_at: 1_700_000_000_500,
};

const session: Session = {
  id: 'm1',
  user_id: 'local',
  started_at: 1_700_000_000_000,
  ended_at: 1_700_000_360_000,
  template_id: null,
  updated_at: 1_700_000_360_000,
};

const exercise = makeExercise({ user_id: 'local', updated_at: 1_700_000_000_123 });
const set = makeSet({ user_id: 'local', logged_at: 1_700_000_100_000, rpe: 8.5 });

const samples: [SyncedTable, SyncedRow][] = [
  ['exercises', exercise],
  ['templates', template],
  ['template_items', item],
  ['set_logs', set],
  ['sessions', session],
  ['sessions', { ...session, ended_at: null }],
];

function outbox(table: SyncedTable, op: OutboxRow['op'], payload: SyncedRow): OutboxRow {
  return { id: `o-${payload.id}-${op}`, table, op, payload, created_at: 0 };
}

describe('toRemote / toLocal', () => {
  for (const [table, row] of samples) {
    it(`round-trips a ${table} row`, () => {
      const remote = toRemote(table, row, 'user-uuid');
      expect(remote?.user_id).toBe('user-uuid');
      expect(toLocal(table, remote)).toEqual(row);
    });
  }

  it('sends times as ISO timestamps', () => {
    expect(toRemote('set_logs', set, 'u')).toMatchObject({
      logged_at: '2023-11-14T22:15:00.000Z',
    });
    expect(toRemote('sessions', { ...session, ended_at: null }, 'u')?.ended_at).toBeNull();
  });

  it('sends only the columns this app knows', () => {
    const remote = toRemote('set_logs', { ...set, tempo: '3-1-1' }, 'u');
    expect(Object.keys(remote ?? {}).sort()).toEqual(
      ['exercise_id', 'id', 'kind', 'logged_at', 'reps', 'rpe', 'session_id', 'updated_at', 'user_id', 'weight'],
    );
  });

  it('never sends the server-owned synced_at', () => {
    expect(toRemote('exercises', { ...exercise, synced_at: 'x' }, 'u')).not.toHaveProperty('synced_at');
  });

  it('fills an old outbox payload before sending it', () => {
    const oldItem = without(item, 'user_id', 'updated_at');
    expect(toRemote('template_items', oldItem, 'u')).toMatchObject({
      user_id: 'u',
      updated_at: new Date(0).toISOString(),
    });
  });

  it('gives a pulled row the local owner and ignores remote-only columns', () => {
    const remote = { ...toRemote('set_logs', set, 'user-uuid'), synced_at: '2026-01-01T00:00:00Z' };
    expect(toLocal('set_logs', remote)).toEqual(set);
    expect(toLocal('set_logs', remote, 'someone')?.user_id).toBe('someone');
  });

  it('returns null for malformed rows', () => {
    expect(toRemote('set_logs', { id: 'x' }, 'u')).toBeNull();
    expect(toLocal('template_items', { id: 'x' })).toBeNull();
    expect(toLocal('exercises', 'nope')).toBeNull();
  });
});

describe('newerWins', () => {
  it('takes a row we do not have', () => {
    expect(newerWins(undefined, { updated_at: 1 })).toBe(true);
  });

  it('takes a newer row and keeps ours on an older one', () => {
    expect(newerWins({ updated_at: 1 }, { updated_at: 2 })).toBe(true);
    expect(newerWins({ updated_at: 2 }, { updated_at: 1 })).toBe(false);
  });

  it('keeps ours on a tie', () => {
    expect(newerWins({ updated_at: 5 }, { updated_at: 5 })).toBe(false);
  });
});

describe('seededSetIds', () => {
  const logged = makeSet({ logged_at: 1 });
  const seeded = makeSet({ logged_at: 2 });
  const seededThenDeleted = makeSet({ logged_at: 3 });

  it('picks the sets that were never queued, keeping every logged one', () => {
    const queue = [outbox('set_logs', 'upsert', logged), outbox('set_logs', 'delete', seededThenDeleted)];
    expect(seededSetIds([logged, seeded, seededThenDeleted], queue)).toEqual([seeded.id, seededThenDeleted.id]);
  });

  it('ignores upserts for other tables with the same id', () => {
    expect(seededSetIds([seeded], [outbox('sessions', 'upsert', { ...session, id: seeded.id })])).toEqual([seeded.id]);
  });

  it('keeps everything when every set was logged', () => {
    expect(seededSetIds([logged], [outbox('set_logs', 'upsert', logged)])).toEqual([]);
  });
});

describe('unqueuedRows', () => {
  it('returns rows with no upsert queued for that table', () => {
    const other = makeExercise({ name: 'Other' });
    const queue = [outbox('exercises', 'upsert', exercise), outbox('exercises', 'delete', other)];
    expect(unqueuedRows('exercises', [exercise, other], queue)).toEqual([other]);
  });

  it('does not count a queued row of another table', () => {
    expect(unqueuedRows('templates', [template], [outbox('template_items', 'upsert', { ...item, id: 't1' })])).toEqual([
      template,
    ]);
  });
});

describe('pushBatches', () => {
  const at = (row: OutboxRow, created_at: number): OutboxRow => ({ ...row, id: `${row.id}@${created_at}`, created_at });
  const shape = (result: ReturnType<typeof pushBatches>) =>
    result.batches.map((b) => `${b.table}:${b.op}:${b.items.map((i) => i.id).join(',')}`);

  it('keeps write order across tables and ops, one batch per run', () => {
    const a = makeSet({ logged_at: 1 });
    const b = makeSet({ logged_at: 2 });
    const queue = [
      at(outbox('set_logs', 'upsert', a), 1),
      at(outbox('set_logs', 'upsert', b), 2),
      at(outbox('set_logs', 'delete', a), 3),
      at(outbox('sessions', 'upsert', session), 4),
      at(outbox('set_logs', 'upsert', b), 5),
    ];
    expect(shape(pushBatches(queue, 'u', 200))).toEqual([
      `set_logs:upsert:${a.id},${b.id}`,
      `set_logs:delete:${a.id}`,
      'sessions:upsert:m1',
      `set_logs:upsert:${b.id}`,
    ]);
  });

  it('sorts by created_at whatever order the outbox arrives in', () => {
    const queue = [at(outbox('sessions', 'upsert', session), 9), at(outbox('templates', 'upsert', template), 1)];
    expect(shape(pushBatches(queue, 'u', 200))).toEqual(['templates:upsert:t1', 'sessions:upsert:m1']);
  });

  it('caps a batch at maxRows', () => {
    const queue = [1, 2, 3, 4, 5].map((t) => at(outbox('set_logs', 'upsert', makeSet({ logged_at: t })), t));
    expect(pushBatches(queue, 'u', 2).batches.map((b) => b.items.length)).toEqual([2, 2, 1]);
  });

  it('sends one row per id, the latest, and clears every outbox row for it', () => {
    const first = at(outbox('template_items', 'upsert', { ...item, sort_order: 0 }), 1);
    const second = at(outbox('template_items', 'upsert', { ...item, sort_order: 5 }), 2);
    const [batch] = pushBatches([first, second], 'u', 200).batches;
    expect(batch.items).toHaveLength(1);
    expect(batch.items[0].row?.sort_order).toBe(5);
    expect(batch.items[0].outboxIds).toEqual([first.id, second.id]);
  });

  it('converts upserts to remote rows owned by the signed-in user, and deletes to ids', () => {
    const queue = [at(outbox('set_logs', 'upsert', set), 1), at(outbox('set_logs', 'delete', set), 2)];
    const [upsert, remove] = pushBatches(queue, 'user-uuid', 200).batches;
    expect(upsert.items[0].row).toMatchObject({ id: set.id, user_id: 'user-uuid' });
    expect(remove.items[0]).toEqual({ id: set.id, outboxIds: [queue[1].id], row: null });
  });

  it('leaves an unreadable payload out and reports it', () => {
    const broken: OutboxRow = {
      id: 'bad',
      table: 'set_logs',
      op: 'upsert',
      payload: { ...set, logged_at: Number.NaN },
      created_at: 1,
    };
    const result = pushBatches([broken, at(outbox('templates', 'upsert', template), 2)], 'u', 200);
    expect(result.unreadable).toEqual(['bad']);
    expect(shape(result)).toEqual(['templates:upsert:t1']);
  });

  it('returns nothing for an empty outbox', () => {
    expect(pushBatches([], 'u', 200)).toEqual({ batches: [], unreadable: [] });
  });
});
