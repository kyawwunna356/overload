import type { Exercise, SetLog, Template, TemplateItem } from './types';

// Merging duplicates that sync can create. Each device invents its own ids for the catalogue and
// its own default list; a fresh device adopts the account's instead (lib/sync/adopt.ts), but when
// that can't happen — two devices both used before signing in, an old tab still running earlier
// code — an account ends up with two catalogues and two default lists, and the board shows
// whichever list happens to sort first. This puts them back together.
//
// Deterministic: every device holding the same rows reaches the same result (the kept copy is
// always the lowest id), so devices repairing at the same time agree, and last-write-wins just
// picks between identical answers. Nothing is deleted except list entries that became exact
// duplicates: extra exercises are archived (hidden, and archiving syncs where a delete wouldn't),
// sets move to the kept twin of their exercise, and extra lists stop being the default.

export type Repair = {
  exercises: Exercise[];
  templates: Template[];
  itemPuts: TemplateItem[];
  itemDeletes: TemplateItem[];
  sets: SetLog[];
};

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const nameKey = (name: string) => name.trim().toLowerCase();

// Same-named, unarchived exercises: every extra id mapped to the one that stays (the lowest id).
export function duplicateExercises(exercises: readonly Exercise[]): Map<string, string> {
  const kept = new Map<string, string>();
  const twins = new Map<string, string>();
  for (const exercise of [...exercises].filter((e) => !e.archived).sort(byId)) {
    const key = nameKey(exercise.name);
    const keeper = kept.get(key);
    if (keeper === undefined) kept.set(key, exercise.id);
    else twins.set(exercise.id, keeper);
  }
  return twins;
}

export function isEmptyRepair(repair: Repair): boolean {
  return (
    repair.exercises.length === 0 &&
    repair.templates.length === 0 &&
    repair.itemPuts.length === 0 &&
    repair.itemDeletes.length === 0 &&
    repair.sets.length === 0
  );
}

export function repairDuplicates(
  input: {
    exercises: readonly Exercise[];
    templates: readonly Template[];
    items: readonly TemplateItem[];
    // Only the sets of duplicated exercises need to be passed; others are left alone anyway.
    sets: readonly SetLog[];
  },
  now: number,
): Repair {
  const twins = duplicateExercises(input.exercises);
  const keptId = (exerciseId: string) => twins.get(exerciseId) ?? exerciseId;

  const exercises = input.exercises
    .filter((exercise) => twins.has(exercise.id))
    .map((exercise) => ({ ...exercise, archived: true, updated_at: now }))
    .sort(byId);

  const sets = input.sets
    .filter((set) => twins.has(set.exercise_id))
    .map((set) => ({ ...set, exercise_id: keptId(set.exercise_id), updated_at: now }))
    .sort(byId);

  // The default list that stays is the lowest id; the others stop being defaults.
  const defaults = input.templates.filter((template) => template.is_default).sort(byId);
  const keeper = defaults[0];
  const templates = defaults
    .slice(1)
    .map((template) => ({ ...template, is_default: false, updated_at: now }));

  const itemPuts: TemplateItem[] = [];
  const itemDeletes: TemplateItem[] = [];
  if (keeper !== undefined) {
    // One merged list: the kept list's picks in their order, then each other list's picks in
    // theirs. An exercise already on it is dropped, so nothing appears twice.
    const rank = new Map(defaults.map((template, i) => [template.id, i]));
    const merged = input.items
      .filter((item) => rank.has(item.template_id))
      .sort(
        (a, b) =>
          (rank.get(a.template_id) ?? 0) - (rank.get(b.template_id) ?? 0) ||
          a.sort_order - b.sort_order ||
          byId(a, b),
      );

    const seen = new Set<string>();
    const nextInPattern = new Map<string, number>();
    for (const item of merged) {
      const exerciseId = keptId(item.exercise_id);
      if (seen.has(exerciseId)) {
        itemDeletes.push(item);
        continue;
      }
      seen.add(exerciseId);
      const sortOrder = nextInPattern.get(item.pattern) ?? 0;
      nextInPattern.set(item.pattern, sortOrder + 1);
      if (
        item.template_id !== keeper.id ||
        item.exercise_id !== exerciseId ||
        item.sort_order !== sortOrder
      ) {
        itemPuts.push({
          ...item,
          template_id: keeper.id,
          exercise_id: exerciseId,
          sort_order: sortOrder,
          updated_at: now,
        });
      }
    }
  }

  return { exercises, templates, itemPuts, itemDeletes, sets };
}
