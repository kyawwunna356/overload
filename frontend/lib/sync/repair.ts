import Dexie from 'dexie';
import { db } from '../db';
import { duplicateExercises, isEmptyRepair, repairDuplicates } from '../domain/repair';
import { outboxRow } from '../outbox';

// Runs after every pull: if the account holds two copies of the catalogue or two default lists
// (see lib/domain/repair.ts), merge them locally. The fixes are ordinary local writes — Dexie
// first, with their outbox rows, in one transaction (Hard Rule 5) — so they go up with the next
// push and every other device lands on the same answer. Returns whether anything changed.
export async function repairLocal(now: number): Promise<boolean> {
  return db.transaction(
    'rw',
    [db.exercises, db.templates, db.template_items, db.set_logs, db.outbox],
    async () => {
      const exercises = await db.exercises.toArray();
      const twins = [...duplicateExercises(exercises).keys()];
      // Only the sets of an extra copy can need moving; read those through the main index.
      const sets = (
        await Promise.all(
          twins.map((id) =>
            db.set_logs
              .where('[exercise_id+logged_at]')
              .between([id, Dexie.minKey], [id, Dexie.maxKey])
              .toArray(),
          ),
        )
      ).flat();

      const repair = repairDuplicates(
        {
          exercises,
          templates: await db.templates.toArray(),
          items: await db.template_items.toArray(),
          sets,
        },
        now,
      );
      if (isEmptyRepair(repair)) return false;

      await db.exercises.bulkPut(repair.exercises);
      await db.templates.bulkPut(repair.templates);
      await db.template_items.bulkPut(repair.itemPuts);
      await db.template_items.bulkDelete(repair.itemDeletes.map((item) => item.id));
      await db.set_logs.bulkPut(repair.sets);
      await db.outbox.bulkAdd([
        ...repair.exercises.map((row) => outboxRow('exercises', 'upsert', row, now)),
        ...repair.templates.map((row) => outboxRow('templates', 'upsert', row, now)),
        ...repair.itemPuts.map((row) => outboxRow('template_items', 'upsert', row, now)),
        ...repair.itemDeletes.map((row) => outboxRow('template_items', 'delete', row, now)),
        ...repair.sets.map((row) => outboxRow('set_logs', 'upsert', row, now)),
      ]);
      return true;
    },
  );
}
