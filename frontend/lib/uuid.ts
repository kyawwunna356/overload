import { v7 } from 'uuid';

// Client-generated, time-sortable ids. `at` pins the embedded timestamp so
// seeded rows sort by the time they claim to have happened, not by insertion.
export function newId(at?: number): string {
  return v7(at === undefined ? undefined : { msecs: at });
}
