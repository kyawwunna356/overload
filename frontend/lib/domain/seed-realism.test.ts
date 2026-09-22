import { describe, expect, it } from 'vitest';
import { generateSeed } from '../seed';
import { buildBoard } from './board';
import { previousSet } from './previous';
import { staleness } from './staleness';

// The domain functions run against the ~6 weeks of seed data the app boots with,
// which also guards the seed's promises (stale, never-performed, mixed set kinds).
const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);
const seed = generateSeed(NOW);

function idOf(name: string): string {
  const exercise = seed.exercises.find((e) => e.name === name);
  if (!exercise) throw new Error(`seed has no exercise named ${name}`);
  return exercise.id;
}

describe('domain functions on the seed data', () => {
  it("previousSet returns Back Squat's last working set", () => {
    const id = idOf('Back Squat');
    const working = seed.setLogs
      .filter((l) => l.exercise_id === id && l.kind === 'working')
      .sort((a, b) => a.logged_at - b.logged_at);
    const prev = previousSet(id, seed.setLogs);
    expect(prev).not.toBeNull();
    expect(prev?.kind).toBe('working');
    expect(prev).toEqual(working[working.length - 1]);
  });

  it('previousSet skips a newer drop or failure set for at least one exercise', () => {
    const skipped = seed.exercises.filter((e) => {
      const own = seed.setLogs.filter((l) => l.exercise_id === e.id);
      if (own.length === 0) return false;
      const newest = own.reduce((a, b) => (b.logged_at > a.logged_at ? b : a));
      const prev = previousSet(e.id, own);
      return newest.kind !== 'working' && prev !== null && prev.logged_at < newest.logged_at;
    });
    expect(skipped.length).toBeGreaterThan(0);
  });

  it('flags never-performed exercises with null', () => {
    for (const name of ['Goblet Squat', 'Back Extension', 'Ab Wheel']) {
      expect(previousSet(idOf(name), seed.setLogs)).toBeNull();
      expect(staleness(idOf(name), seed.setLogs, NOW)).toBeNull();
    }
  });

  it('staleness separates the dropped Front Squat from the current Bulgarian Split Squat', () => {
    const front = staleness(idOf('Front Squat'), seed.setLogs, NOW);
    const bulgarian = staleness(idOf('Bulgarian Split Squat'), seed.setLogs, NOW);
    expect(front).not.toBeNull();
    expect(bulgarian).not.toBeNull();
    // Timezone shifts the seeded session hours slightly, so assert a range.
    expect(front).toBeGreaterThan(24);
    expect(front).toBeLessThan(31);
    expect(bulgarian).toBeLessThan(8);
  });

  it('buildBoard shows a list of seeded exercises in the order picked, with their real values', () => {
    // A list like one you'd build yourself: deliberately not in recency order.
    const picked = ['Leg Press', 'Back Squat', 'Goblet Squat', 'Bench Press'];
    const list = picked.map((name, i) => ({ exercise_id: idOf(name), sort_order: i }));
    const groups = buildBoard(seed.exercises, seed.setLogs, NOW, list);
    expect(groups.map((g) => g.pattern)).toEqual(['squat', 'hinge', 'push', 'pull', 'accessory', 'core']);

    const squat = groups.find((g) => g.pattern === 'squat');
    expect(squat?.rows.map((r) => r.exercise.name)).toEqual(['Leg Press', 'Back Squat', 'Goblet Squat']);
    // Back Squat is the most recently trained of the three and still sits where it was put.
    expect(squat?.rows[1].lastSet?.kind).toBe('working');
    expect(squat?.rows[2].lastSet).toBeNull(); // Goblet Squat was never performed
    expect(groups.find((g) => g.pattern === 'push')?.rows.map((r) => r.exercise.name)).toEqual(['Bench Press']);
    // Patterns nothing was picked for still come back, empty.
    expect(groups.find((g) => g.pattern === 'core')?.rows).toEqual([]);
  });

  it('seeds the whole catalogue but picks nothing: the default template starts empty', () => {
    expect(seed.templates).toHaveLength(1);
    expect(seed.templates[0].is_default).toBe(true);
    expect(seed.templateItems).toEqual([]);
    expect(seed.exercises.length).toBeGreaterThanOrEqual(60);
    const names = seed.exercises.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const pattern of ['squat', 'hinge', 'push', 'pull', 'accessory', 'core']) {
      expect(seed.exercises.filter((e) => e.pattern === pattern).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('gives every seeded set an exercise that exists', () => {
    const ids = new Set(seed.exercises.map((e) => e.id));
    expect(seed.setLogs.every((log) => ids.has(log.exercise_id))).toBe(true);
    expect(seed.setLogs.length).toBeGreaterThan(300);
  });

  it('every performed exercise is within the seeded six weeks', () => {
    for (const exercise of seed.exercises) {
      const days = staleness(exercise.id, seed.setLogs, NOW);
      if (days === null) continue;
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThan(43);
    }
  });
});
