import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db';
import { pendingIds, pullSince, remoteCursor, shouldApply, toLocal } from '../domain/replica';
import type { SyncCursor, SyncedRow, SyncedTable } from '../domain/types';

// Brings the account's rows down into Dexie: everything the server accepted since this device's
// last pull, table by table. Background only — the screens never wait for it, they just update
// through their live queries as rows land (Hard Rule 5).
//
// - Last write wins on updated_at, and a row with an unpushed local change is left alone.
// - Pulled rows are the server's copy, so they're written without an outbox row.
// - Each page, and the cursor after it, goes in one Dexie transaction: a pull cut off halfway
//   resumes from the last page it finished.

// Parents before the rows that point at them, so a restore never shows a set without its exercise.
const ORDER: readonly SyncedTable[] = ['exercises', 'templates', 'template_items', 'sessions', 'set_logs'];

// Supabase's max_rows; a shorter page means the table is done.
const PAGE = 1000;

// Returns false if it had to stop (offline or refused), so the caller can tell.
export async function pullAll(client: SupabaseClient): Promise<boolean> {
  for (const table of ORDER) {
    if (!(await pullTable(client, table))) return false;
  }
  return true;
}

async function pullTable(client: SupabaseClient, table: SyncedTable): Promise<boolean> {
  let after: SyncCursor | null = null;
  const since = pullSince(await db.sync_state.get(table));

  for (;;) {
    let query = client.from(table).select('*').order('synced_at').order('id').limit(PAGE);
    if (after) {
      // Keyset paging: strictly after the last row read, so a row edited mid-pull can't shift the
      // pages and make another one slip through.
      query = query.or(
        `synced_at.gt."${after.at}",and(synced_at.eq."${after.at}",id.gt.${after.id})`,
      );
    } else if (since) {
      query = query.gte('synced_at', since);
    }

    const { data, error } = await query;
    if (error || !data) return false;
    const last = await apply(table, data);
    if (data.length < PAGE || last === null) return true;
    after = last;
  }
}

async function apply(table: SyncedTable, rows: readonly unknown[]): Promise<SyncCursor | null> {
  const target = db.table<SyncedRow, string>(table);
  const last = rows.length > 0 ? remoteCursor(table, rows[rows.length - 1]) : null;

  await db.transaction('rw', target, db.outbox, db.sync_state, async () => {
    const incoming = rows.flatMap((raw) => {
      const row = toLocal(table, raw);
      return row ? [row] : [];
    });
    if (incoming.length > 0) {
      const pending = pendingIds(await db.outbox.toArray());
      const locals = await target.bulkGet(incoming.map((row) => row.id));
      const changed = incoming.filter((row, i) => shouldApply(locals[i], row, pending));
      if (changed.length > 0) await target.bulkPut(changed);
    }
    if (last) await db.sync_state.put(last);
  });
  return last;
}
