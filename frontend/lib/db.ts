import Dexie, { type EntityTable } from 'dexie';
import { LOCAL_USER_ID } from './constants';
import {
  readExercise,
  readSession,
  readSetLog,
  readTemplate,
  readTemplateItem,
} from './domain/rows';
import { seededSetIds, unqueuedRows } from './domain/replica';
import type {
  Exercise,
  OutboxRow,
  Session,
  SetLog,
  Template,
  TemplateItem,
} from './domain/types';
import { outboxRow } from './outbox';
import { catalogueExercises, generateSeed, type SeedData } from './seed';

// The single read path for the UI (Hard Rule 5). Every write goes here first,
// then enqueues an outbox row.
//
// Schema changes require a new `this.version(n)` block with a migration —
// never edit an existing one.
class GymDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  templates!: EntityTable<Template, 'id'>;
  template_items!: EntityTable<TemplateItem, 'id'>;
  set_logs!: EntityTable<SetLog, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  outbox!: EntityTable<OutboxRow, 'id'>;

  constructor() {
    super('gym-tracker');

    // Booleans aren't valid IndexedDB keys, so archived / is_default aren't indexed.
    this.version(1).stores({
      exercises: 'id, pattern',
      templates: 'id',
      template_items: 'id, template_id, exercise_id',
      // The query the app is built around: the latest sets of one exercise.
      set_logs: 'id, [exercise_id+logged_at], session_id, logged_at',
      sessions: 'id, started_at',
      outbox: 'id, created_at',
    });

    // No schema change: the catalogue grew, so a device that seeded earlier gets the
    // exercises it's missing. Matched by name, because ids are generated per seed run.
    // Nothing is removed and no history is touched — an exercise you no longer want is
    // simply one you don't add to your list.
    this.version(2).upgrade(async (tx) => {
      const exercises = tx.table<Exercise, string>('exercises');
      const known = new Set((await exercises.toArray()).map((row) => row.name));
      const missing = catalogueExercises(Date.now()).filter((row) => !known.has(row.name));
      if (missing.length > 0) await exercises.bulkAdd(missing);
    });

    // No index change: sync arrives (milestone 6), and three things make the store ready for it.
    //
    // 1. List items gain the two fields every synced row has: user_id (RLS) and updated_at
    //    (last write wins). An item stored before now is older than any edit, so 0.
    // 2. Production only: the fake training the seed wrote is removed, so the backup holds only
    //    real sets. A set you logged got an outbox row in the same transaction; the seed never
    //    wrote one (`seededSetIds`). Dev keeps its fixture.
    // 3. Everything that was never queued (the catalogue, the list) is queued now, so the outbox
    //    is the single path to the server.
    this.version(3).upgrade(async (tx) => {
      const now = Date.now();
      await tx
        .table<Partial<TemplateItem>, string>('template_items')
        .toCollection()
        .modify((item) => {
          item.user_id ??= LOCAL_USER_ID;
          item.updated_at ??= 0;
        });

      const outbox = tx.table<OutboxRow, string>('outbox');
      const queued = await outbox.toArray();

      if (process.env.NODE_ENV === 'production') {
        const sets = tx.table<SetLog, string>('set_logs');
        await sets.bulkDelete(seededSetIds(await sets.toArray(), queued));
      }

      const backlog = [
        ...unqueuedRows('exercises', await tx.table<Exercise, string>('exercises').toArray(), queued)
          .map((row) => outboxRow('exercises', 'upsert', row, now)),
        ...unqueuedRows('templates', await tx.table<Template, string>('templates').toArray(), queued)
          .map((row) => outboxRow('templates', 'upsert', row, now)),
        ...unqueuedRows('template_items', await tx.table<TemplateItem, string>('template_items').toArray(), queued)
          .map((row) => outboxRow('template_items', 'upsert', row, now)),
      ];
      if (backlog.length > 0) await outbox.bulkAdd(backlog);
    });

    // Every read goes through the table's reader, which fills fields added after a row was
    // stored (and keeps a row with a value from a newer app). Old history never has to be
    // rewritten to fit new code: see `lib/domain/rows.ts`.
    this.exercises.hook('reading', (row) => readExercise(row) ?? row);
    this.templates.hook('reading', (row) => readTemplate(row) ?? row);
    this.template_items.hook('reading', (row) => readTemplateItem(row) ?? row);
    this.set_logs.hook('reading', (row) => readSetLog(row) ?? row);
    this.sessions.hook('reading', (row) => readSession(row) ?? row);

    // Fires once, when the database is first created — so a reload never reseeds.
    this.on('populate', () => {
      insertSeed(this, generateSeed(Date.now()));
    });
  }
}

export const db = new GymDB();

// The catalogue and the empty list, queued for the first push like every other row. The fake
// training is a dev fixture only: a real install starts with no history, and it's never queued.
function insertSeed(target: GymDB, seed: SeedData) {
  const now = Date.now();
  const queue = [
    ...seed.exercises.map((row) => outboxRow('exercises', 'upsert', row, now)),
    ...seed.templates.map((row) => outboxRow('templates', 'upsert', row, now)),
    ...seed.templateItems.map((row) => outboxRow('template_items', 'upsert', row, now)),
  ];
  return Promise.all([
    target.exercises.bulkAdd(seed.exercises),
    target.templates.bulkAdd(seed.templates),
    target.template_items.bulkAdd(seed.templateItems),
    target.outbox.bulkAdd(queue),
    process.env.NODE_ENV === 'production' ? undefined : target.set_logs.bulkAdd(seed.setLogs),
  ]);
}

// Dev only: wipe every table and reseed. Refuses in production, where the local
// store may hold the only copy of real training data.
export async function resetAndSeed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('resetAndSeed is dev-only');
  }
  const seed = generateSeed(Date.now());
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await insertSeed(db, seed);
  });
}
