import type { OutboxRow, SyncedRow, SyncedTable } from './domain/types';
import { newId } from './uuid';

// One queued change for the sync layer to push. Shared by the write path and the Dexie
// migrations, so both queue rows the same way.
export function outboxRow(
  table: SyncedTable,
  op: OutboxRow['op'],
  payload: SyncedRow,
  at: number,
): OutboxRow {
  return { id: newId(at), table, op, payload, created_at: at };
}
