import Dexie, { type EntityTable } from 'dexie';
import type {
  Exercise,
  OutboxRow,
  Session,
  SetLog,
  Template,
  TemplateItem,
} from './domain/types';
import { generateSeed, type SeedData } from './seed';

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

    // Fires once, when the database is first created — so a reload never reseeds.
    this.on('populate', () => {
      insertSeed(this, generateSeed(Date.now()));
    });
  }
}

export const db = new GymDB();

function insertSeed(target: GymDB, seed: SeedData) {
  return Promise.all([
    target.exercises.bulkAdd(seed.exercises),
    target.templates.bulkAdd(seed.templates),
    target.template_items.bulkAdd(seed.templateItems),
    target.set_logs.bulkAdd(seed.setLogs),
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
