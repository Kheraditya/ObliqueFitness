# Phase 3: Progress & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three remaining placeholder/disabled screens (Home dashboard, Profile → Statistics, Profile → Measures) with real progress visualization backed by the workout data Phase 2b-2 now writes: a home summary card, a muscle-group heatmap, per-exercise strength trend charts, and body measurement tracking.

**Architecture:** One new table (`body_measurements`, owner-only RLS matching the existing pattern). Everything else — streaks, week-over-week volume, muscle balance, strength trends — is derived client-side from existing `workout_sessions`/`workout_sets`/`exercises` rows, following the project's established pattern (`getRoutineVolumeHistory`, `getPersonalRecords`) of pulling raw rows and computing in TypeScript rather than pushing aggregation into SQL. Non-trivial computations (streak counting, % change, muscle→zone folding) are extracted into small pure functions so they're unit-testable without mocking Supabase.

**Tech Stack:** React Native + Expo Router, Supabase (Postgres + RLS), `react-native-svg` (already installed, used directly for the muscle heatmap — no new dependency), `victory-native` (already installed, used for line charts via `VictoryLine`), Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-04-phase3-progress-analytics-design.md`

## Global Constraints

- No new tab-bar entries — reuse the two disabled buttons already scaffolded in `app/(member)/profile/index.tsx` ("Statistics", "Measures").
- `body_measurements` RLS follows the exact `workout_sessions`/`workout_sets` pattern from `supabase/migrations/0002_rls_policies.sql`: an owner policy (`for all using (user_id = auth.uid())`) plus an admin-read policy using the existing `current_user_is_admin()`/`current_user_gym_id()` helper functions. No `WITH CHECK` is written explicitly — Postgres fills it from `USING`, the audited pattern already in use everywhere else in this schema.
- Best-1RM uses the Epley formula already established in `src/features/exercises/api.ts`'s `getPersonalRecords`: `weight * (1 + reps / 30)`. Do not introduce a different formula.
- The 17-muscle vocabulary seeded from free-exercise-db (`abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes, hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders, traps, triceps`) maps onto exactly 16 heatmap zones per the spec's §4 table — `lats` and `middle back` share one `upperBack` zone; every other muscle gets its own zone.
- Muscle-balance volume attributes 100% of a set's `weight * reps` to each of its exercise's `primary_muscles` only — `secondary_muscles` are excluded from this aggregate (a deliberate simplification, not a bug).
- Testing conventions already established in this codebase, apply throughout: `jest.clearAllMocks()` in a `beforeEach` for any test file with multiple `it` blocks sharing a mock; every `fireEvent` call (both `changeText` and `press`) must be `await`ed whenever a test performs more than one sequential interaction before a later read — this has been empirically proven necessary even for components with zero async effects; `victory-native` components render directly in tests (not mocked) — this project's Jest config already transforms them cleanly, proven by the existing `SmokeChart.test.tsx` and `routines/[id].test.tsx`.
- No `any` types. Follow the existing `unknown as RowType` cast pattern for Supabase row shapes (see any existing `src/features/*/api.ts` file).
- Feature-level pure `.ts` modules (e.g. `streak.ts`, `volume.ts`) get a co-located `.test.ts` sibling file (no `__tests__` subfolder) — matching `src/features/workout/api.test.ts`'s placement, not the component/screen convention. Components get `components/__tests__/X.test.tsx`; screens under `app/` get `__tests__/X.test.tsx`.

---

### Task 1: `body_measurements` table, RLS, and types

**Files:**
- Create: `supabase/migrations/0008_body_measurements.sql`
- Create: `src/features/measurements/types.ts`

**Interfaces:**
- Produces: the `body_measurements` table and the `Measurement` type Tasks 2 and 12 consume.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0008_body_measurements.sql`:

```sql
create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  value numeric not null,
  unit text not null,
  logged_at timestamptz not null default now()
);

alter table body_measurements enable row level security;

create policy "body_measurements_owner" on body_measurements
  for all using (user_id = auth.uid());

create policy "body_measurements_admin_read" on body_measurements
  for select using (
    current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: migration `0008_body_measurements` applies cleanly with no errors.

- [ ] **Step 3: Write the types file**

Create `src/features/measurements/types.ts`:

```ts
export interface Measurement {
  id: string;
  type: string;
  value: number;
  unit: string;
  loggedAt: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_body_measurements.sql src/features/measurements/types.ts
git commit -m "feat: add body_measurements table, RLS, and types"
```

---

### Task 2: Measurements API

**Files:**
- Create: `src/features/measurements/api.ts`
- Create: `src/features/measurements/api.test.ts`

**Interfaces:**
- Consumes: `Measurement` (Task 1), `supabase` client (`src/lib/supabase.ts`).
- Produces: `listMeasurements`, `logMeasurement`, `deleteMeasurement` — consumed by Task 12.

- [ ] **Step 1: Write the failing tests**

Create `src/features/measurements/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { listMeasurements, logMeasurement, deleteMeasurement } from './api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listMeasurements', () => {
  it('lists all measurements ordered by date when no type is given', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'm1', type: 'weight', value: 80, unit: 'kg', logged_at: '2026-09-01T00:00:00Z' }],
      error: null,
    });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMeasurements();

    expect(supabase.from).toHaveBeenCalledWith('body_measurements');
    expect(result).toEqual([{ id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-01T00:00:00Z' }]);
  });

  it('filters by type when given', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'm2', type: 'body_fat', value: 18, unit: '%', logged_at: '2026-09-02T00:00:00Z' }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMeasurements('body_fat');

    expect(eq).toHaveBeenCalledWith('type', 'body_fat');
    expect(result).toEqual([{ id: 'm2', type: 'body_fat', value: 18, unit: '%', loggedAt: '2026-09-02T00:00:00Z' }]);
  });

  it('returns an empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMeasurements();

    expect(result).toEqual([]);
  });
});

describe('logMeasurement', () => {
  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await logMeasurement('weight', 80, 'kg');

    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('inserts a body_measurements row for the current user', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    const insert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const result = await logMeasurement('weight', 80, 'kg');

    expect(supabase.from).toHaveBeenCalledWith('body_measurements');
    expect(insert).toHaveBeenCalledWith({ user_id: 'u1', type: 'weight', value: 80, unit: 'kg' });
    expect(result).toEqual({ error: null });
  });
});

describe('deleteMeasurement', () => {
  it('deletes a measurement by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const result = await deleteMeasurement('m1');

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual({ error: null });
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/measurements/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement**

Create `src/features/measurements/api.ts`:

```ts
import { supabase } from '../../lib/supabase';
import type { Measurement } from './types';

interface MeasurementRow {
  id: string;
  type: string;
  value: number;
  unit: string;
  logged_at: string;
}

export async function listMeasurements(type?: string): Promise<Measurement[]> {
  const base = supabase.from('body_measurements').select('id, type, value, unit, logged_at');
  const filtered = type ? base.eq('type', type) : base;
  const { data, error } = await filtered.order('logged_at', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as MeasurementRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    value: row.value,
    unit: row.unit,
    loggedAt: row.logged_at,
  }));
}

export async function logMeasurement(type: string, value: number, unit: string): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: 'Not authenticated' };

  const { error } = await supabase.from('body_measurements').insert({ user_id: session.user.id, type, value, unit });
  return { error: error ? error.message : null };
}

export async function deleteMeasurement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  return { error: error ? error.message : null };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/measurements/api.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/measurements/api.ts src/features/measurements/api.test.ts
git commit -m "feat: add measurements API"
```

---

### Task 3: Streak computation (pure logic)

**Files:**
- Create: `src/features/progress/streak.ts`
- Create: `src/features/progress/streak.test.ts`

**Interfaces:**
- Produces: `computeStreak(sessionDates: string[], today?: Date): number` — consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Create `src/features/progress/streak.test.ts`:

```ts
import { computeStreak } from './streak';

describe('computeStreak', () => {
  const today = new Date(2026, 8, 4); // Sept 4, 2026 (month is 0-indexed)

  it('returns 0 when there are no sessions', () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it('counts 3 consecutive days ending today', () => {
    expect(computeStreak(['2026-09-04', '2026-09-03', '2026-09-02'], today)).toBe(3);
  });

  it('stops at a gap', () => {
    expect(computeStreak(['2026-09-04', '2026-09-03', '2026-09-01'], today)).toBe(2);
  });

  it('is still alive if the most recent session was yesterday (today not over yet)', () => {
    expect(computeStreak(['2026-09-03', '2026-09-02'], today)).toBe(2);
  });

  it('is broken if the most recent session was 2+ days ago', () => {
    expect(computeStreak(['2026-09-02'], today)).toBe(0);
  });

  it('deduplicates multiple sessions on the same day', () => {
    expect(computeStreak(['2026-09-04', '2026-09-04', '2026-09-03'], today)).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/progress/streak.test.ts`
Expected: FAIL — `Cannot find module './streak'`

- [ ] **Step 3: Implement**

Create `src/features/progress/streak.ts`:

```ts
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msPerDay);
}

export function computeStreak(sessionDates: string[], today: Date = new Date()): number {
  const uniqueDates = Array.from(new Set(sessionDates)).sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const mostRecent = parseDate(uniqueDates[0]);
  const gapFromToday = daysBetween(todayMidnight, mostRecent);

  if (gapFromToday > 1) return 0;

  let streak = 1;
  let cursor = mostRecent;

  for (let i = 1; i < uniqueDates.length; i++) {
    const candidate = parseDate(uniqueDates[i]);
    if (daysBetween(cursor, candidate) === 1) {
      streak += 1;
      cursor = candidate;
    } else {
      break;
    }
  }

  return streak;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/progress/streak.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/progress/streak.ts src/features/progress/streak.test.ts
git commit -m "feat: add streak computation"
```

---

### Task 4: Volume change % computation (pure logic)

**Files:**
- Create: `src/features/progress/volume.ts`
- Create: `src/features/progress/volume.test.ts`

**Interfaces:**
- Produces: `computeVolumeChangePct(thisWeek: number, lastWeek: number): number | null` — consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Create `src/features/progress/volume.test.ts`:

```ts
import { computeVolumeChangePct } from './volume';

describe('computeVolumeChangePct', () => {
  it('computes a positive percentage increase', () => {
    expect(computeVolumeChangePct(150, 100)).toBe(50);
  });

  it('computes a negative percentage decrease', () => {
    expect(computeVolumeChangePct(50, 100)).toBe(-50);
  });

  it('returns null when last week had zero volume (avoids divide-by-zero)', () => {
    expect(computeVolumeChangePct(100, 0)).toBeNull();
  });

  it('returns null when both weeks had zero volume', () => {
    expect(computeVolumeChangePct(0, 0)).toBeNull();
  });

  it('rounds to one decimal place', () => {
    expect(computeVolumeChangePct(110, 90)).toBe(22.2);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/progress/volume.test.ts`
Expected: FAIL — `Cannot find module './volume'`

- [ ] **Step 3: Implement**

Create `src/features/progress/volume.ts`:

```ts
export function computeVolumeChangePct(thisWeek: number, lastWeek: number): number | null {
  if (lastWeek === 0) return null;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 1000) / 10;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/progress/volume.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/progress/volume.ts src/features/progress/volume.test.ts
git commit -m "feat: add volume change percentage computation"
```

---

### Task 5: Muscle-to-zone mapping (pure logic)

**Files:**
- Create: `src/features/progress/muscleZones.ts`
- Create: `src/features/progress/muscleZones.test.ts`

**Interfaces:**
- Produces: `Zone` type, `MUSCLE_TO_ZONE`, `zoneVolumes(muscleVolumes): Record<Zone, number>` — consumed by Task 8.

- [ ] **Step 1: Write the failing tests**

Create `src/features/progress/muscleZones.test.ts`:

```ts
import { zoneVolumes } from './muscleZones';

describe('zoneVolumes', () => {
  it('folds lats and middle back into the shared upperBack zone', () => {
    const result = zoneVolumes([
      { muscle: 'lats', volume: 100 },
      { muscle: 'middle back', volume: 50 },
    ]);
    expect(result.upperBack).toBe(150);
  });

  it('maps single-muscle zones directly', () => {
    const result = zoneVolumes([{ muscle: 'chest', volume: 200 }]);
    expect(result.chest).toBe(200);
  });

  it('ignores an unknown muscle string', () => {
    const result = zoneVolumes([{ muscle: 'unknown_muscle', volume: 999 }]);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('returns 0 for every zone with no matching muscle', () => {
    const result = zoneVolumes([{ muscle: 'chest', volume: 200 }]);
    expect(result.hamstrings).toBe(0);
    expect(result.calves).toBe(0);
  });

  it('returns all 16 zone keys even with empty input', () => {
    const result = zoneVolumes([]);
    expect(Object.keys(result).sort()).toEqual(
      [
        'abductors', 'abs', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'glutes',
        'hamstrings', 'lowerBack', 'neck', 'quads', 'shoulders', 'traps', 'triceps', 'upperBack',
      ].sort()
    );
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/progress/muscleZones.test.ts`
Expected: FAIL — `Cannot find module './muscleZones'`

- [ ] **Step 3: Implement**

Create `src/features/progress/muscleZones.ts`:

```ts
export type Zone =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'adductors'
  | 'traps'
  | 'upperBack'
  | 'lowerBack'
  | 'triceps'
  | 'glutes'
  | 'hamstrings'
  | 'abductors'
  | 'calves';

export const FRONT_ZONES: Zone[] = ['neck', 'shoulders', 'chest', 'biceps', 'forearms', 'abs', 'quads', 'adductors'];
export const BACK_ZONES: Zone[] = ['traps', 'upperBack', 'lowerBack', 'triceps', 'glutes', 'hamstrings', 'abductors', 'calves'];

export const MUSCLE_TO_ZONE: Record<string, Zone> = {
  neck: 'neck',
  shoulders: 'shoulders',
  chest: 'chest',
  biceps: 'biceps',
  forearms: 'forearms',
  abdominals: 'abs',
  quadriceps: 'quads',
  adductors: 'adductors',
  traps: 'traps',
  lats: 'upperBack',
  'middle back': 'upperBack',
  'lower back': 'lowerBack',
  triceps: 'triceps',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  abductors: 'abductors',
  calves: 'calves',
};

export function zoneVolumes(muscleVolumes: { muscle: string; volume: number }[]): Record<Zone, number> {
  const result: Record<Zone, number> = {
    neck: 0,
    shoulders: 0,
    chest: 0,
    biceps: 0,
    forearms: 0,
    abs: 0,
    quads: 0,
    adductors: 0,
    traps: 0,
    upperBack: 0,
    lowerBack: 0,
    triceps: 0,
    glutes: 0,
    hamstrings: 0,
    abductors: 0,
    calves: 0,
  };

  for (const { muscle, volume } of muscleVolumes) {
    const zone = MUSCLE_TO_ZONE[muscle];
    if (zone) result[zone] += volume;
  }

  return result;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/progress/muscleZones.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/progress/muscleZones.ts src/features/progress/muscleZones.test.ts
git commit -m "feat: add muscle-to-zone mapping"
```

---

### Task 6: Progress API — home summary and muscle volumes

**Files:**
- Create: `src/features/progress/api.ts`
- Create: `src/features/progress/api.test.ts`

**Interfaces:**
- Consumes: `computeStreak` (Task 3), `computeVolumeChangePct` (Task 4), `supabase` client.
- Produces: `getHomeSummary(): Promise<HomeSummary>`, `getMuscleVolumes(): Promise<{muscle: string; volume: number}[]>`, `HomeSummary` type — consumed by Tasks 9 and 11.

- [ ] **Step 1: Write the failing tests**

Create `src/features/progress/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { getMuscleVolumes, getHomeSummary } from './api';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getMuscleVolumes', () => {
  it('sums weight*reps per primary muscle across the last 7 days', async () => {
    const gte = jest.fn().mockResolvedValue({
      data: [
        {
          started_at: '2026-09-03T00:00:00Z',
          workout_sets: [
            { weight: 100, reps: 5, exercises: { primary_muscles: ['chest', 'triceps'] } },
            { weight: 50, reps: 10, exercises: { primary_muscles: ['triceps'] } },
          ],
        },
      ],
      error: null,
    });
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getMuscleVolumes();

    expect(supabase.from).toHaveBeenCalledWith('workout_sessions');
    expect(result).toEqual(
      expect.arrayContaining([
        { muscle: 'chest', volume: 500 },
        { muscle: 'triceps', volume: 1000 },
      ])
    );
  });

  it('returns an empty array on error', async () => {
    const gte = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getMuscleVolumes();

    expect(result).toEqual([]);
  });
});

describe('getHomeSummary', () => {
  it('computes workout count, volume change, streak, and muscle volumes', async () => {
    const volumeGte = jest.fn().mockResolvedValue({
      data: [
        {
          started_at: '2026-09-03T00:00:00Z',
          workout_sets: [{ weight: 100, reps: 5, exercises: { primary_muscles: ['chest'] } }],
        },
        {
          started_at: '2026-08-25T00:00:00Z',
          workout_sets: [{ weight: 100, reps: 4, exercises: { primary_muscles: ['chest'] } }],
        },
      ],
      error: null,
    });
    const volumeSelect = jest.fn(() => ({ gte: volumeGte }));

    const streakOrder = jest.fn().mockResolvedValue({
      data: [
        { started_at: '2026-09-04T00:00:00Z', ended_at: '2026-09-04T01:00:00Z' },
        { started_at: '2026-09-03T00:00:00Z', ended_at: '2026-09-03T01:00:00Z' },
      ],
      error: null,
    });
    const streakGte = jest.fn(() => ({ order: streakOrder }));
    const streakSelect = jest.fn(() => ({ gte: streakGte }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: volumeSelect })
      .mockReturnValueOnce({ select: streakSelect });

    const result = await getHomeSummary();

    expect(result.workoutCountThisWeek).toBe(1);
    expect(result.volumeChangePct).toBe(25);
    expect(result.streakDays).toBe(2);
    expect(result.muscleVolumes).toEqual([{ muscle: 'chest', volume: 500 }]);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/progress/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement**

Create `src/features/progress/api.ts`:

```ts
import { supabase } from '../../lib/supabase';
import { computeStreak } from './streak';
import { computeVolumeChangePct } from './volume';

export interface HomeSummary {
  workoutCountThisWeek: number;
  volumeChangePct: number | null;
  streakDays: number;
  muscleVolumes: { muscle: string; volume: number }[];
}

interface SessionWithSetsRow {
  started_at: string;
  workout_sets: { weight: number | null; reps: number | null; exercises: { primary_muscles: string[] } | null }[];
}

interface StreakSessionRow {
  started_at: string;
  ended_at: string | null;
}

function daysAgoISOString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function toDateString(isoString: string): string {
  return isoString.slice(0, 10);
}

function sessionVolume(row: SessionWithSetsRow): number {
  return row.workout_sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

function sumMuscleVolumes(rows: SessionWithSetsRow[]): { muscle: string; volume: number }[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    for (const set of row.workout_sets) {
      const volume = (set.weight ?? 0) * (set.reps ?? 0);
      for (const muscle of set.exercises?.primary_muscles ?? []) {
        totals.set(muscle, (totals.get(muscle) ?? 0) + volume);
      }
    }
  }

  return Array.from(totals.entries()).map(([muscle, volume]) => ({ muscle, volume }));
}

export async function getMuscleVolumes(): Promise<{ muscle: string; volume: number }[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, workout_sets(weight, reps, exercises(primary_muscles))')
    .gte('started_at', daysAgoISOString(7));

  if (error || !data) return [];

  return sumMuscleVolumes(data as unknown as SessionWithSetsRow[]);
}

export async function getHomeSummary(): Promise<HomeSummary> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, workout_sets(weight, reps, exercises(primary_muscles))')
    .gte('started_at', daysAgoISOString(14));

  const rows = error || !data ? [] : (data as unknown as SessionWithSetsRow[]);

  const sevenDaysAgo = daysAgoISOString(7);
  const thisWeekRows = rows.filter((r) => r.started_at >= sevenDaysAgo);
  const lastWeekRows = rows.filter((r) => r.started_at < sevenDaysAgo);

  const thisWeekVolume = thisWeekRows.reduce((sum, r) => sum + sessionVolume(r), 0);
  const lastWeekVolume = lastWeekRows.reduce((sum, r) => sum + sessionVolume(r), 0);

  const { data: streakData } = await supabase
    .from('workout_sessions')
    .select('started_at, ended_at')
    .gte('started_at', daysAgoISOString(90))
    .order('started_at', { ascending: false });

  const streakRows = (streakData ?? []) as unknown as StreakSessionRow[];
  const completedDates = streakRows.filter((r) => r.ended_at != null).map((r) => toDateString(r.started_at));

  return {
    workoutCountThisWeek: thisWeekRows.length,
    volumeChangePct: computeVolumeChangePct(thisWeekVolume, lastWeekVolume),
    streakDays: computeStreak(completedDates),
    muscleVolumes: sumMuscleVolumes(thisWeekRows),
  };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/progress/api.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/progress/api.ts src/features/progress/api.test.ts
git commit -m "feat: add progress API (home summary, muscle volumes)"
```

---

### Task 7: Exercises API extension — strength trend and logged exercises

**Files:**
- Modify: `src/features/exercises/api.ts`
- Modify: `src/features/exercises/api.test.ts`

**Interfaces:**
- Consumes: existing `WorkoutSetRow`/`HistoryRow` interfaces already in `src/features/exercises/api.ts`.
- Produces: `getStrengthTrend(exerciseId): Promise<{date, maxWeight, best1RM}[]>` (consumed by Task 10), `getLoggedExercises(): Promise<{id, name}[]>` (consumed by Task 11).

- [ ] **Step 1: Write the failing tests**

Add to `src/features/exercises/api.test.ts` (append these `describe` blocks; add `getStrengthTrend, getLoggedExercises` to the existing import from `./api`):

```ts
describe('getStrengthTrend', () => {
  it('returns one point per session with max weight and best 1RM', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { weight: 100, reps: 5, session_id: 's1', workout_sessions: { started_at: '2026-09-01T00:00:00Z' } },
        { weight: 110, reps: 3, session_id: 's1', workout_sessions: { started_at: '2026-09-01T00:00:00Z' } },
        { weight: 90, reps: 8, session_id: 's2', workout_sessions: { started_at: '2026-09-03T00:00:00Z' } },
      ],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getStrengthTrend('ex1');

    expect(supabase.from).toHaveBeenCalledWith('workout_sets');
    expect(result).toEqual([
      { date: '2026-09-01T00:00:00Z', maxWeight: 110, best1RM: 110 * (1 + 3 / 30) },
      { date: '2026-09-03T00:00:00Z', maxWeight: 90, best1RM: 90 * (1 + 8 / 30) },
    ]);
  });

  it('returns an empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getStrengthTrend('ex1');

    expect(result).toEqual([]);
  });
});

describe('getLoggedExercises', () => {
  it('returns distinct exercises sorted by name', async () => {
    const select = jest.fn().mockResolvedValue({
      data: [
        { exercise_id: 'ex2', exercises: { name: 'Squat' } },
        { exercise_id: 'ex1', exercises: { name: 'Bench Press' } },
        { exercise_id: 'ex2', exercises: { name: 'Squat' } },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getLoggedExercises();

    expect(supabase.from).toHaveBeenCalledWith('workout_sets');
    expect(result).toEqual([
      { id: 'ex1', name: 'Bench Press' },
      { id: 'ex2', name: 'Squat' },
    ]);
  });

  it('returns an empty array on error', async () => {
    const select = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getLoggedExercises();

    expect(result).toEqual([]);
  });
});
```

`src/features/exercises/api.test.ts` currently has no `beforeEach(() => jest.clearAllMocks())` — add one, right after the `import { supabase } from '../../lib/supabase';` / `import { ... } from './api';` block, before the first `describe`. This file already has multiple `describe` blocks sharing the `supabase.from`/`supabase.auth.getSession` mocks, so mock call history must be cleared between tests to avoid leakage between the new tests and the pre-existing ones — the same fix already applied in `src/features/routines/api.test.ts` and `src/features/workout/api.test.ts`. Also add `getStrengthTrend, getLoggedExercises` to the existing `import { ... } from './api';` line's destructured list.

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/exercises/api.test.ts`
Expected: FAIL — `getStrengthTrend is not a function` / `getLoggedExercises is not a function`

- [ ] **Step 3: Implement**

Add to `src/features/exercises/api.ts` (below the existing `getExerciseHistory` function, reusing the existing `HistoryRow`/`WorkoutSetRow` interfaces already defined at the top of this file):

```ts
export async function getStrengthTrend(exerciseId: string): Promise<{ date: string; maxWeight: number; best1RM: number }[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, session_id, workout_sessions(started_at)')
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: true });

  if (error || !data) return [];

  const rows = data as unknown as HistoryRow[];
  const bySession = new Map<string, { date: string; maxWeight: number; best1RM: number }>();

  for (const row of rows) {
    const date = row.workout_sessions?.started_at ?? '';
    const weight = row.weight ?? 0;
    const reps = row.reps ?? 0;
    const oneRM = weight * (1 + reps / 30);

    const existing = bySession.get(row.session_id);
    if (!existing) {
      bySession.set(row.session_id, { date, maxWeight: weight, best1RM: oneRM });
    } else {
      existing.maxWeight = Math.max(existing.maxWeight, weight);
      existing.best1RM = Math.max(existing.best1RM, oneRM);
    }
  }

  return Array.from(bySession.values()).sort((a, b) => a.date.localeCompare(b.date));
}

interface LoggedExerciseRow {
  exercise_id: string;
  exercises: { name: string } | null;
}

export async function getLoggedExercises(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from('workout_sets').select('exercise_id, exercises(name)');
  if (error || !data) return [];

  const rows = data as unknown as LoggedExerciseRow[];
  const seen = new Map<string, string>();

  for (const row of rows) {
    if (!seen.has(row.exercise_id)) seen.set(row.exercise_id, row.exercises?.name ?? '');
  }

  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/exercises/api.test.ts`
Expected: PASS (all tests in the file, including the pre-existing ones)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/exercises/api.ts src/features/exercises/api.test.ts
git commit -m "feat: add strength trend and logged exercises to exercises API"
```

---

### Task 8: MuscleHeatmap component

**Files:**
- Create: `src/features/progress/components/MuscleHeatmap.tsx`
- Create: `src/features/progress/components/__tests__/MuscleHeatmap.test.tsx`

**Interfaces:**
- Consumes: `zoneVolumes`, `Zone` (Task 5), `colors` (`src/theme`).
- Produces: `MuscleHeatmap({ muscleVolumes })` — consumed by Task 11.

- [ ] **Step 1: Write the failing tests**

Create `src/features/progress/components/__tests__/MuscleHeatmap.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MuscleHeatmap, interpolateColor } from '../MuscleHeatmap';

describe('interpolateColor', () => {
  it('returns the cold color at t=0', () => {
    expect(interpolateColor(0)).toBe('rgb(44, 44, 46)');
  });

  it('returns the hot color at t=1', () => {
    expect(interpolateColor(1)).toBe('rgb(10, 132, 255)');
  });
});

describe('MuscleHeatmap', () => {
  it('renders the front view by default without crashing', async () => {
    await render(<MuscleHeatmap muscleVolumes={[{ muscle: 'chest', volume: 500 }]} />);
    expect(screen.getByText('Front')).toBeTruthy();
    expect(screen.toJSON()).not.toBeNull();
  });

  it('switches to the back view when pressed', async () => {
    await render(<MuscleHeatmap muscleVolumes={[{ muscle: 'glutes', volume: 300 }]} />);
    await fireEvent.press(screen.getByText('Back'));
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders with an empty muscleVolumes array without crashing', async () => {
    await render(<MuscleHeatmap muscleVolumes={[]} />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/progress/components/__tests__/MuscleHeatmap.test.tsx`
Expected: FAIL — `Cannot find module '../MuscleHeatmap'`

- [ ] **Step 3: Implement**

Create `src/features/progress/components/MuscleHeatmap.tsx`:

```tsx
import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors, spacing } from '../../../theme';
import { zoneVolumes, type Zone } from '../muscleZones';

interface ShapeDef {
  zone: Zone;
  x: number;
  y: number;
  width: number;
  height: number;
}

const FRONT_SHAPES: ShapeDef[] = [
  { zone: 'neck', x: 88, y: 40, width: 24, height: 16 },
  { zone: 'shoulders', x: 48, y: 56, width: 104, height: 18 },
  { zone: 'chest', x: 65, y: 76, width: 70, height: 38 },
  { zone: 'biceps', x: 38, y: 76, width: 20, height: 50 },
  { zone: 'biceps', x: 142, y: 76, width: 20, height: 50 },
  { zone: 'forearms', x: 34, y: 128, width: 18, height: 48 },
  { zone: 'forearms', x: 148, y: 128, width: 18, height: 48 },
  { zone: 'abs', x: 70, y: 116, width: 60, height: 38 },
  { zone: 'quads', x: 68, y: 156, width: 28, height: 68 },
  { zone: 'quads', x: 104, y: 156, width: 28, height: 68 },
  { zone: 'adductors', x: 94, y: 162, width: 12, height: 50 },
];

const BACK_SHAPES: ShapeDef[] = [
  { zone: 'traps', x: 80, y: 42, width: 40, height: 28 },
  { zone: 'upperBack', x: 65, y: 72, width: 70, height: 48 },
  { zone: 'triceps', x: 38, y: 76, width: 20, height: 50 },
  { zone: 'triceps', x: 142, y: 76, width: 20, height: 50 },
  { zone: 'forearms', x: 34, y: 128, width: 18, height: 48 },
  { zone: 'forearms', x: 148, y: 128, width: 18, height: 48 },
  { zone: 'lowerBack', x: 75, y: 122, width: 50, height: 28 },
  { zone: 'glutes', x: 68, y: 152, width: 64, height: 28 },
  { zone: 'abductors', x: 58, y: 152, width: 10, height: 60 },
  { zone: 'abductors', x: 132, y: 152, width: 10, height: 60 },
  { zone: 'hamstrings', x: 68, y: 182, width: 28, height: 50 },
  { zone: 'hamstrings', x: 104, y: 182, width: 28, height: 50 },
  { zone: 'calves', x: 68, y: 234, width: 28, height: 56 },
  { zone: 'calves', x: 104, y: 234, width: 28, height: 56 },
];

const COLD = { r: 0x2c, g: 0x2c, b: 0x2e }; // colors.surfaceElevated
const HOT = { r: 0x0a, g: 0x84, b: 0xff }; // colors.accent

export function interpolateColor(t: number): string {
  const r = Math.round(COLD.r + (HOT.r - COLD.r) * t);
  const g = Math.round(COLD.g + (HOT.g - COLD.g) * t);
  const b = Math.round(COLD.b + (HOT.b - COLD.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function MuscleHeatmap({ muscleVolumes }: { muscleVolumes: { muscle: string; volume: number }[] }) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const volumes = zoneVolumes(muscleVolumes);
  const maxVolume = Math.max(0, ...Object.values(volumes));
  const shapes = view === 'front' ? FRONT_SHAPES : BACK_SHAPES;

  function colorFor(zone: Zone): string {
    if (maxVolume === 0) return colors.surfaceElevated;
    return interpolateColor(volumes[zone] / maxVolume);
  }

  return (
    <View>
      <View style={styles.toggleRow}>
        <Pressable onPress={() => setView('front')} style={styles.toggleButton}>
          <Text style={view === 'front' ? styles.toggleActive : styles.toggleInactive}>Front</Text>
        </Pressable>
        <Pressable onPress={() => setView('back')} style={styles.toggleButton}>
          <Text style={view === 'back' ? styles.toggleActive : styles.toggleInactive}>Back</Text>
        </Pressable>
      </View>
      <Svg viewBox="0 0 200 400" width="100%" height={280}>
        <Circle cx={100} cy={25} r={18} fill={colors.surfaceElevated} stroke={colors.border} strokeWidth={1} />
        {shapes.map((shape, index) => (
          <Rect
            key={`${shape.zone}-${index}`}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={6}
            fill={colorFor(shape.zone)}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.l,
    marginBottom: spacing.s,
  },
  toggleButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
  },
  toggleActive: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  toggleInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 15,
  },
});
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/progress/components/__tests__/MuscleHeatmap.test.tsx`
Expected: PASS (5/5)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/progress/components/MuscleHeatmap.tsx src/features/progress/components/__tests__/MuscleHeatmap.test.tsx
git commit -m "feat: add muscle heatmap component"
```

---

### Task 9: Home dashboard screen

**Files:**
- Modify: `app/(member)/home.tsx`
- Create: `app/(member)/__tests__/home.test.tsx`

**Interfaces:**
- Consumes: `getHomeSummary`, `HomeSummary` (Task 6).

- [ ] **Step 1: Write the failing test**

Create `app/(member)/__tests__/home.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../src/features/progress/api', () => ({
  getHomeSummary: jest.fn(),
}));

import { getHomeSummary } from '../../../src/features/progress/api';
import Home from '../home';

describe('Home', () => {
  it('renders the workout count, volume change, streak, and top muscles', async () => {
    (getHomeSummary as jest.Mock).mockResolvedValue({
      workoutCountThisWeek: 3,
      volumeChangePct: 12.5,
      streakDays: 4,
      muscleVolumes: [
        { muscle: 'chest', volume: 500 },
        { muscle: 'legs', volume: 300 },
      ],
    });

    await render(<Home />);

    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    expect(screen.getByText('+12.5%')).toBeTruthy();
    expect(screen.getByText('4d')).toBeTruthy();
    expect(screen.getByText('chest')).toBeTruthy();
  });

  it('shows a placeholder message when there is no muscle volume data yet', async () => {
    (getHomeSummary as jest.Mock).mockResolvedValue({
      workoutCountThisWeek: 0,
      volumeChangePct: null,
      streakDays: 0,
      muscleVolumes: [],
    });

    await render(<Home />);

    await waitFor(() => expect(screen.getByText('Log a workout to see your muscle balance.')).toBeTruthy());
    expect(screen.getByText('–')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/__tests__/home.test.tsx"`
Expected: FAIL — the current `home.tsx` renders static placeholder text, not these values.

- [ ] **Step 3: Implement**

Replace the contents of `app/(member)/home.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { getHomeSummary, type HomeSummary } from '../../src/features/progress/api';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function Home() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    getHomeSummary().then(setSummary);
  }, []);

  const topMuscles = (summary?.muscleVolumes ?? [])
    .slice()
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6);
  const maxMuscleVolume = Math.max(1, ...topMuscles.map((m) => m.volume));

  return (
    <Screen>
      <ScrollView>
        <Text style={[typography.title, styles.heading]}>Welcome back</Text>
        <View style={styles.statsRow}>
          <StatTile label="Workouts" value={String(summary?.workoutCountThisWeek ?? 0)} />
          <StatTile
            label="Volume"
            value={
              summary?.volumeChangePct == null
                ? '–'
                : `${summary.volumeChangePct > 0 ? '+' : ''}${summary.volumeChangePct}%`
            }
          />
          <StatTile label="Streak" value={`${summary?.streakDays ?? 0}d`} />
        </View>
        <Text style={[typography.title, styles.sectionHeading]}>Muscle Balance</Text>
        {topMuscles.length === 0 ? (
          <Text style={typography.subtitle}>Log a workout to see your muscle balance.</Text>
        ) : (
          <View style={styles.barList}>
            {topMuscles.map((m) => (
              <View key={m.muscle} style={styles.barRow}>
                <Text style={styles.barLabel}>{m.muscle}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(m.volume / maxMuscleVolume) * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tileLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  barList: {
    gap: spacing.s,
  },
  barRow: {
    gap: spacing.xs,
  },
  barLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/__tests__/home.test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add real home dashboard card"
```

---

### Task 10: Strength trend chart on the exercise Summary tab

**Files:**
- Modify: `src/features/exercises/components/SummaryTab.tsx`
- Create: `src/features/exercises/components/__tests__/SummaryTab.test.tsx`

**Interfaces:**
- Consumes: `getStrengthTrend` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `src/features/exercises/components/__tests__/SummaryTab.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../api', () => ({
  getPersonalRecords: jest.fn().mockResolvedValue({
    heaviestWeight: 100,
    best1RM: 110,
    bestSetVolume: 500,
    bestSessionVolume: 1500,
  }),
  getStrengthTrend: jest.fn(),
}));

import { getStrengthTrend } from '../../api';
import { SummaryTab } from '../SummaryTab';

const exercise = {
  id: 'ex1',
  name: 'Bench Press',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  equipment: 'barbell',
  instructions: [],
  images: [],
  is_custom: false,
  created_by: null,
};

describe('SummaryTab', () => {
  it('renders a strength trend chart when trend data exists', async () => {
    (getStrengthTrend as jest.Mock).mockResolvedValue([
      { date: '2026-09-01T00:00:00Z', maxWeight: 100, best1RM: 110 },
      { date: '2026-09-03T00:00:00Z', maxWeight: 105, best1RM: 115 },
    ]);

    await render(<SummaryTab exercise={exercise} />);

    await waitFor(() => expect(screen.getByText('Strength Trend')).toBeTruthy());
    expect(screen.queryByText('No data yet.')).toBeNull();
  });

  it('shows "No data yet." when there is no trend data', async () => {
    (getStrengthTrend as jest.Mock).mockResolvedValue([]);

    await render(<SummaryTab exercise={exercise} />);

    await waitFor(() => expect(screen.getByText('No data yet.')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest src/features/exercises/components/__tests__/SummaryTab.test.tsx`
Expected: FAIL — `getStrengthTrend` is not called by the current component, "Strength Trend" text doesn't exist.

- [ ] **Step 3: Implement**

Replace the contents of `src/features/exercises/components/SummaryTab.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { getPersonalRecords, getStrengthTrend } from '../api';
import type { Exercise, PersonalRecords } from '../types';
import { colors, radius, spacing, typography } from '../../../theme';

export function SummaryTab({ exercise }: { exercise: Exercise }) {
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [trend, setTrend] = useState<{ date: string; maxWeight: number; best1RM: number }[]>([]);

  useEffect(() => {
    getPersonalRecords(exercise.id).then(setRecords);
    getStrengthTrend(exercise.id).then(setTrend);
  }, [exercise.id]);

  return (
    <View>
      {exercise.images[0] && <Image source={{ uri: exercise.images[0] }} style={styles.image} resizeMode="cover" />}
      <Text style={[typography.label, styles.muscleRow]}>
        Primary: {exercise.primary_muscles.join(', ') || '-'}
      </Text>
      {exercise.secondary_muscles.length > 0 && (
        <Text style={typography.label}>Secondary: {exercise.secondary_muscles.join(', ')}</Text>
      )}
      <View style={styles.card}>
        <RecordRow label="Heaviest Weight" value={records?.heaviestWeight} />
        <RecordRow label="Best 1RM" value={records?.best1RM} />
        <RecordRow label="Best Set Volume" value={records?.bestSetVolume} />
        <RecordRow label="Best Session Volume" value={records?.bestSessionVolume} />
      </View>
      <Text style={[typography.title, styles.chartHeading]}>Strength Trend</Text>
      <View style={styles.chartCard}>
        {trend.length === 0 ? (
          <Text style={typography.subtitle}>No data yet.</Text>
        ) : (
          <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryLine data={trend.map((t) => ({ x: t.date, y: t.maxWeight }))} />
          </VictoryChart>
        )}
      </View>
    </View>
  );
}

function RecordRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <View style={styles.recordRow}>
      <Text style={typography.body}>{label}</Text>
      <Text style={typography.body}>{value != null ? Math.round(value * 10) / 10 : '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.m,
    backgroundColor: colors.surface,
    marginBottom: spacing.m,
  },
  muscleRow: {
    marginBottom: spacing.xs,
  },
  card: {
    marginTop: spacing.l,
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chartHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    minHeight: 120,
    justifyContent: 'center',
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest src/features/exercises/components/__tests__/SummaryTab.test.tsx`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/exercises/components/SummaryTab.tsx src/features/exercises/components/__tests__/SummaryTab.test.tsx
git commit -m "feat: add strength trend chart to exercise summary"
```

---

### Task 11: Statistics screen

**Files:**
- Create: `app/(member)/profile/statistics.tsx`
- Create: `app/(member)/profile/__tests__/statistics.test.tsx`

**Interfaces:**
- Consumes: `getMuscleVolumes` (Task 6), `getLoggedExercises` (Task 7), `MuscleHeatmap` (Task 8).
- Produces: the screen Task 13's "Statistics" button navigates to.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/profile/__tests__/statistics.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/api', () => ({
  getMuscleVolumes: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getLoggedExercises: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { getMuscleVolumes } from '../../../../src/features/progress/api';
import { getLoggedExercises } from '../../../../src/features/exercises/api';
import { router } from 'expo-router';
import Statistics from '../statistics';

describe('Statistics', () => {
  it('renders the heatmap and a list of logged exercises', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([{ muscle: 'chest', volume: 500 }]);
    (getLoggedExercises as jest.Mock).mockResolvedValue([{ id: 'ex1', name: 'Bench Press' }]);

    await render(<Statistics />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Front')).toBeTruthy();
    expect(screen.toJSON()).not.toBeNull();
  });

  it('navigates to the exercise detail screen when a row is pressed', async () => {
    (getMuscleVolumes as jest.Mock).mockResolvedValue([]);
    (getLoggedExercises as jest.Mock).mockResolvedValue([{ id: 'ex1', name: 'Bench Press' }]);

    await render(<Statistics />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByText('Bench Press'));

    expect(router.push).toHaveBeenCalledWith('/(member)/profile/exercises/ex1');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/profile/__tests__/statistics.test.tsx"`
Expected: FAIL — `Cannot find module '../statistics'`

- [ ] **Step 3: Implement**

Create `app/(member)/profile/statistics.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { getMuscleVolumes } from '../../../src/features/progress/api';
import { getLoggedExercises } from '../../../src/features/exercises/api';
import { MuscleHeatmap } from '../../../src/features/progress/components/MuscleHeatmap';
import { colors, spacing, typography } from '../../../src/theme';

export default function Statistics() {
  const [muscleVolumes, setMuscleVolumes] = useState<{ muscle: string; volume: number }[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getMuscleVolumes().then(setMuscleVolumes);
    getLoggedExercises().then(setExercises);
  }, []);

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Statistics</Text>
      <MuscleHeatmap muscleVolumes={muscleVolumes} />
      <Text style={[typography.title, styles.sectionHeading]}>Exercises</Text>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(member)/profile/exercises/${item.id}`)}>
            <Text style={typography.body}>{item.name}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/profile/__tests__/statistics.test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add app/\(member\)/profile/statistics.tsx app/\(member\)/profile/__tests__/statistics.test.tsx
git commit -m "feat: add Statistics screen"
```

---

### Task 12: Measures screen

**Files:**
- Create: `app/(member)/profile/measures.tsx`
- Create: `app/(member)/profile/__tests__/measures.test.tsx`

**Interfaces:**
- Consumes: `listMeasurements`, `logMeasurement`, `deleteMeasurement`, `Measurement` (Task 2).
- Produces: the screen Task 13's "Measures" button navigates to.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/profile/__tests__/measures.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/measurements/api', () => ({
  listMeasurements: jest.fn(),
  logMeasurement: jest.fn(),
  deleteMeasurement: jest.fn(),
}));

import { listMeasurements, logMeasurement, deleteMeasurement } from '../../../../src/features/measurements/api';
import Measures from '../measures';

describe('Measures', () => {
  it('logs a weight measurement and refreshes the list', async () => {
    (listMeasurements as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' }]);
    (logMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('No data yet.')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Value'), '80');
    await fireEvent.press(screen.getByText('Log'));

    expect(logMeasurement).toHaveBeenCalledWith('weight', 80, 'kg');
    await waitFor(() => expect(screen.getByText('80 kg')).toBeTruthy());
  });

  it('deletes a measurement when Delete is pressed', async () => {
    (listMeasurements as jest.Mock).mockResolvedValue([
      { id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-04T00:00:00Z' },
    ]);
    (deleteMeasurement as jest.Mock).mockResolvedValue({ error: null });

    await render(<Measures />);
    await waitFor(() => expect(screen.getByText('80 kg')).toBeTruthy());

    await fireEvent.press(screen.getByText('Delete'));

    expect(deleteMeasurement).toHaveBeenCalledWith('m1');
    await waitFor(() => expect(screen.queryByText('80 kg')).toBeNull());
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/profile/__tests__/measures.test.tsx"`
Expected: FAIL — `Cannot find module '../measures'`

- [ ] **Step 3: Implement**

Create `app/(member)/profile/measures.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { listMeasurements, logMeasurement, deleteMeasurement } from '../../../src/features/measurements/api';
import type { Measurement } from '../../../src/features/measurements/types';
import { colors, radius, spacing, typography } from '../../../src/theme';

const BUILTIN_TYPES: { key: string; label: string; unit: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'body_fat', label: 'Body Fat', unit: '%' },
];

export default function Measures() {
  const [selectedType, setSelectedType] = useState('weight');
  const [customLabel, setCustomLabel] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [entries, setEntries] = useState<Measurement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeType = selectedType === 'custom' ? customLabel : selectedType;

  useEffect(() => {
    if (!activeType) return;
    listMeasurements(activeType).then(setEntries);
  }, [activeType]);

  async function handleLog() {
    const value = parseFloat(valueInput);
    if (Number.isNaN(value) || !activeType) return;

    const unit = selectedType === 'custom' ? customUnit : BUILTIN_TYPES.find((t) => t.key === selectedType)?.unit ?? '';
    const { error: logError } = await logMeasurement(activeType, value, unit);
    if (logError) {
      setError(logError);
      return;
    }
    setValueInput('');
    const updated = await listMeasurements(activeType);
    setEntries(updated);
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await deleteMeasurement(id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <Screen>
      <ScrollView>
        <Text style={[typography.title, styles.heading]}>Measures</Text>
        <View style={styles.typeRow}>
          {BUILTIN_TYPES.map((t) => (
            <Pressable key={t.key} onPress={() => setSelectedType(t.key)} style={styles.typeChip}>
              <Text style={selectedType === t.key ? styles.typeChipActive : styles.typeChipInactive}>{t.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setSelectedType('custom')} style={styles.typeChip}>
            <Text style={selectedType === 'custom' ? styles.typeChipActive : styles.typeChipInactive}>Custom</Text>
          </Pressable>
        </View>
        {selectedType === 'custom' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Label"
              placeholderTextColor={colors.textSecondary}
              value={customLabel}
              onChangeText={setCustomLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Unit"
              placeholderTextColor={colors.textSecondary}
              value={customUnit}
              onChangeText={setCustomUnit}
            />
          </>
        )}
        <TextInput
          style={styles.input}
          placeholder="Value"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={valueInput}
          onChangeText={setValueInput}
        />
        <Button title="Log" onPress={handleLog} />
        {error && <ErrorText>{error}</ErrorText>}
        <View style={styles.chartCard}>
          {entries.length === 0 ? (
            <Text style={typography.subtitle}>No data yet.</Text>
          ) : (
            <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryLine data={entries.map((e) => ({ x: e.loggedAt, y: e.value }))} />
            </VictoryChart>
          )}
        </View>
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={typography.body}>
                {entry.value} {entry.unit}
              </Text>
              <Pressable onPress={() => handleDelete(entry.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  typeChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  typeChipInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.m,
    color: colors.textPrimary,
    marginBottom: spacing.s,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    minHeight: 120,
    justifyContent: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/profile/__tests__/measures.test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add app/\(member\)/profile/measures.tsx app/\(member\)/profile/__tests__/measures.test.tsx
git commit -m "feat: add Measures screen"
```

---

### Task 13: Enable "Statistics" and "Measures" buttons

**Files:**
- Modify: `app/(member)/profile/index.tsx`
- Create: `app/(member)/profile/__tests__/index.test.tsx`

**Interfaces:**
- Consumes: nothing new — navigates to Task 11's and Task 12's routes.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/profile/__tests__/index.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/auth/api', () => ({
  signOut: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

import { router } from 'expo-router';
import ProfileHome from '../index';

describe('ProfileHome', () => {
  it('navigates to Statistics when pressed', async () => {
    await render(<ProfileHome />);
    await fireEvent.press(screen.getByText('Statistics'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/statistics');
  });

  it('navigates to Measures when pressed', async () => {
    await render(<ProfileHome />);
    await fireEvent.press(screen.getByText('Measures'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/measures');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/profile/__tests__/index.test.tsx"`
Expected: FAIL — both buttons are currently `disabled` with no-op `onPress`.

- [ ] **Step 3: Implement**

Modify `app/(member)/profile/index.tsx` — replace the "Statistics" and "Measures" buttons (leave "Calendar" and everything else unchanged):

```tsx
<Button title="Statistics" variant="secondary" onPress={() => router.push('/(member)/profile/statistics')} />
<Button title="Measures" variant="secondary" onPress={() => router.push('/(member)/profile/measures')} />
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/profile/__tests__/index.test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass, pristine.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: enable Statistics and Measures navigation"
```

---

## Manual verification (after all tasks)

1. `npx supabase db push` — confirm the `body_measurements` migration is the only new one, applies cleanly.
2. Open the Home tab — confirm real workout count / volume % / streak numbers (log a couple of workouts first via the existing Active Workout flow if the account has none yet) and a muscle-balance bar list matching recently-logged exercises' primary muscles.
3. Open Profile → Statistics — confirm the heatmap renders, toggling Front/Back changes the colored zones, and zones with more logged volume this week appear more intensely colored (accent blue) than zones with none (neutral gray). Confirm the exercise list shows only exercises you've actually logged, and tapping one opens its detail screen with a real "Strength Trend" chart (previously blank/placeholder).
4. Open Profile → Measures — log a Weight entry, confirm it appears in the list and the trend chart updates; switch to Body Fat and confirm it's tracked separately; try Custom with a made-up label/unit; delete an entry and confirm it disappears from both the list and the chart.
5. Confirm the Profile screen's "Calendar" button is still disabled (unchanged, out of scope for this phase).
