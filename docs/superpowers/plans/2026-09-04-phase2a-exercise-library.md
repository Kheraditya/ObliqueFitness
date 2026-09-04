# Phase 2a: Member Tab Shell + Exercise Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare "Welcome, member" screen with a real Home/Workout/Profile tab shell, and build a full exercise library (seeded data, searchable list, 4-tab detail screen with Summary/History/How-to/Leaderboard) that renders correctly today and populates automatically once live workout logging (Phase 2b) exists.

**Architecture:** New `exercises`/`users` schema columns and a `security definer` leaderboard function (migrations 0004-0006, following the same pattern established in Phase 1). App-side: pure logic (filters, personal-record math) stays in plain TypeScript modules under `src/features/exercises/`, separate from the Expo Router screens that render them, mirroring Phase 1's `src/features/auth/` structure.

**Tech Stack:** Same as Phase 1 — Expo Router, Supabase, Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-04-phase2a-exercise-library-design.md`
**Parent spec:** `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`

## Global Constraints

- TypeScript throughout, no `any` in new code.
- Navigation via Expo Router (file-based routes under `app/`).
- Supabase is the only backend — access control enforced through RLS and `security definer` DB functions, never a custom API layer.
- No in-app payments/IAP.
- Client-exposed env vars use the `EXPO_PUBLIC_` prefix.
- Any new `security definer` function that is reachable by an authenticated (or anon) caller must include an explicit `auth.uid() is null` guard and the narrowest grants that satisfy its purpose (`revoke ... from public, anon` + `grant ... to authenticated` where anonymous access is never legitimate) — this is a hard-won lesson from Phase 1's two security fixes, not optional polish.
- `npm test` / `npx jest <path>` must keep working with no environment variables or CLI flags (Phase 1's Task 2 fix depends on this staying true).

---

## File Structure

```
supabase/migrations/
  0004_exercise_library_schema.sql   # alter exercises + users columns
  0005_leaderboard_function.sql      # get_exercise_leaderboard(), grants
  0006_seed_exercise_library.sql     # generated data migration (~876 rows)

scripts/
  generate-exercise-seed.js          # one-time generation tool (not app runtime code)

src/features/exercises/
  types.ts                           # Exercise, PersonalRecords, HistoryEntry, LeaderboardEntry
  filters.ts                         # pure search/filter logic
  filters.test.ts
  api.ts                             # listExercises, getExercise, getPersonalRecords,
                                      # getExerciseHistory, getLeaderboard, setLeaderboardOptIn
  api.test.ts
  components/
    SummaryTab.tsx
    HistoryTab.tsx
    HowToTab.tsx
    LeaderboardTab.tsx

src/components/
  Button.tsx                         # modified: adds `disabled` prop

app/(member)/
  _layout.tsx                        # modified: Tabs (Home, Workout, Profile) instead of a bare Stack
  home.tsx                           # new: placeholder
  workout.tsx                        # new: placeholder
  profile/
    _layout.tsx                      # new: Stack
    index.tsx                        # new: Profile home (dashboard grid + Sign Out)
    exercises/
      index.tsx                      # new: searchable exercise list
      [id].tsx                       # new: exercise detail (4 tabs)
```

`app/(member)/home.tsx` (Phase 1's bare welcome screen) is replaced by this structure — its only content (the heading and Sign Out button) moves into `profile/index.tsx`.

---

### Task 1: Exercise library schema migration

**Files:**
- Create: `supabase/migrations/0004_exercise_library_schema.sql`

**Interfaces:**
- Produces: `exercises.primary_muscles text[]`, `exercises.secondary_muscles text[]`, `exercises.instructions text[]` (retyped from `text`), `exercises.images text[]`, `users.leaderboard_opt_in boolean`. Tasks 2-11 all depend on these exact column names/types.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_exercise_library_schema.sql`:

```sql
alter table exercises
  drop column muscle_group,
  add column primary_muscles text[] not null default '{}',
  add column secondary_muscles text[] not null default '{}';

alter table exercises
  alter column instructions type text[] using case when instructions is null then '{}'::text[] else array[instructions] end;

alter table exercises
  add column images text[] not null default '{}';

alter table users
  add column leaderboard_opt_in boolean not null default false;
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db reset
```

Expected: exit 0, no `ERROR` lines. Then confirm the columns exist:

```bash
npx supabase db query --local "select column_name, data_type from information_schema.columns where table_name = 'exercises' order by column_name;"
npx supabase db query --local "select column_name, data_type from information_schema.columns where table_name = 'users' and column_name = 'leaderboard_opt_in';"
```

Expected: `exercises` lists `primary_muscles`/`secondary_muscles`/`images` as `ARRAY`, `instructions` as `ARRAY` (not `text`), and no `muscle_group` row at all. `users` lists `leaderboard_opt_in` as `boolean`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_exercise_library_schema.sql
git commit -m "feat: add exercise library and leaderboard opt-in schema"
```

---

### Task 2: Leaderboard security-definer function

**Files:**
- Create: `supabase/migrations/0005_leaderboard_function.sql`

**Interfaces:**
- Consumes: `users.gym_id`, `users.leaderboard_opt_in` (Task 1), `workout_sets`/`workout_sessions` (Phase 1 schema, unchanged).
- Produces: `get_exercise_leaderboard(p_exercise_id uuid) returns table (user_id uuid, name text, heaviest_weight numeric)`, callable only by `authenticated` — used by `getLeaderboard` in Task 5.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_leaderboard_function.sql`:

```sql
create function get_exercise_leaderboard(p_exercise_id uuid)
returns table (user_id uuid, name text, heaviest_weight numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    select u.id, u.name, max(ws.weight)
    from workout_sets ws
    join workout_sessions s on s.id = ws.session_id
    join users u on u.id = s.user_id
    where ws.exercise_id = p_exercise_id
      and u.gym_id = (select gym_id from users where id = auth.uid())
      and u.leaderboard_opt_in = true
    group by u.id, u.name
    order by max(ws.weight) desc
    limit 50;
end;
$$;

revoke execute on function get_exercise_leaderboard(uuid) from public, anon;
grant execute on function get_exercise_leaderboard(uuid) to authenticated;
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db reset
```

Expected: exit 0, no `ERROR` lines.

- [ ] **Step 3: Empirical verification — auth guard, gym scoping, and opt-in filtering**

Run each of these against the local instance and confirm the stated outcome (this mirrors the empirical-verification discipline from Phase 1's Task 4/7 fixes — do not skip it just because the function is new rather than a fix):

```sql
-- Setup: two gyms, one exercise, four users (2 per gym), one opted in per gym
insert into gyms (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Leaderboard Gym A'),
  ('22222222-2222-2222-2222-222222222222', 'Leaderboard Gym B');

-- (insert an exercise row manually for this test, or use any existing seeded one if Task 3 has already run)
insert into exercises (id, name, primary_muscles) values
  ('33333333-3333-3333-3333-333333333333', 'Test Bench Press', array['chest']);

-- create 4 auth.users (triggers create matching public.users rows with role='member', gym_id=null)
-- then, as superuser, set gym_id and leaderboard_opt_in for each, and log a workout_sessions + workout_sets row for each user against the test exercise with distinct weights.
```

1. As an anonymous caller (`set role anon;`), call `select * from get_exercise_leaderboard('33333333-3333-3333-3333-333333333333');` — expect it to fail (either a grant-level rejection from PostgREST/role privileges, or the function's own `Not authenticated` exception if reached).
2. As an authenticated user in Gym A, call the function for the test exercise — expect only Gym A's opted-in user(s) to appear, ordered by heaviest weight descending, and confirm Gym B's users never appear regardless of their opt-in status.
3. As the same Gym A user, confirm a Gym A user who has **not** opted in does not appear in the results even though they logged a heavier set.
4. Clean up the test rows you inserted (or note that `npx supabase db reset` between tasks resets state anyway).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_leaderboard_function.sql
git commit -m "feat: add gym-scoped opt-in leaderboard function"
```

---

### Task 3: Seed the exercise library

**Files:**
- Create: `scripts/generate-exercise-seed.js`
- Create: `supabase/migrations/0006_seed_exercise_library.sql` (generated output — do not hand-write)

**Interfaces:**
- Consumes: `exercises` schema from Task 1.
- Produces: ~876 rows in `exercises`, sourced from free-exercise-db (Unlicense/public domain, verified). Tasks 8-11's screens read this data.

- [ ] **Step 1: Write the generation script**

Create `scripts/generate-exercise-seed.js`:

```js
const fs = require('fs');
const https = require('https');

const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const OUTPUT_PATH = 'supabase/migrations/0006_seed_exercise_library.sql';

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function toSqlTextArray(values) {
  if (!values || values.length === 0) return "'{}'";
  const elements = values.map((v) => {
    const arrayEscaped = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${arrayEscaped}"`;
  });
  const arrayLiteral = `{${elements.join(',')}}`;
  return `'${arrayLiteral.replace(/'/g, "''")}'`;
}

https.get(SOURCE_URL, (res) => {
  let raw = '';
  res.on('data', (chunk) => { raw += chunk; });
  res.on('end', () => {
    const exercises = JSON.parse(raw);
    const rows = exercises.map((ex) => {
      const name = escapeSqlString(ex.name);
      const primaryMuscles = toSqlTextArray(ex.primaryMuscles);
      const secondaryMuscles = toSqlTextArray(ex.secondaryMuscles);
      const equipment = ex.equipment ? `'${escapeSqlString(ex.equipment)}'` : 'null';
      const instructions = toSqlTextArray(ex.instructions);
      const images = toSqlTextArray((ex.images || []).map((img) => IMAGE_BASE + img));
      return `('${name}', ${primaryMuscles}, ${secondaryMuscles}, ${equipment}, ${instructions}, ${images}, false, null)`;
    });

    const sql =
      'insert into exercises (name, primary_muscles, secondary_muscles, equipment, instructions, images, is_custom, created_by)\n' +
      'values\n  ' + rows.join(',\n  ') + ';\n';

    fs.writeFileSync(OUTPUT_PATH, sql);
    console.log(`Wrote ${exercises.length} exercises to ${OUTPUT_PATH}`);
  });
});
```

- [ ] **Step 2: Run the script**

```bash
node scripts/generate-exercise-seed.js
```

Expected output: `Wrote 876 exercises to supabase/migrations/0006_seed_exercise_library.sql` (the exact count may differ slightly if the upstream dataset has changed — that's fine, note the actual count in your report).

- [ ] **Step 3: Apply and verify row count**

```bash
npx supabase db reset
npx supabase db query --local "select count(*) from exercises;"
```

Expected: exit 0, no `ERROR` lines from the reset (this is the real correctness check — if the escaping in Step 1 were wrong, this insert would fail with a SQL syntax error). Row count should match the script's reported count.

- [ ] **Step 4: Spot-check escaping correctness**

```bash
npx supabase db query --local "select name, equipment, array_length(primary_muscles, 1) from exercises where name like '%Farmer%';"
```

Expected: a row named `Farmer's Walk` (apostrophe intact, not truncated or malformed) with a non-null `equipment` value and a positive muscle count. Also spot-check a null-equipment row:

```bash
npx supabase db query --local "select name from exercises where equipment is null limit 3;"
```

Expected: 3 exercise names returned (the dataset has ~77 exercises with no listed equipment — this confirms `null` equipment values round-tripped correctly rather than becoming the literal string `"null"`).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-exercise-seed.js supabase/migrations/0006_seed_exercise_library.sql
git commit -m "feat: seed exercise library from free-exercise-db"
```

---

### Task 4: Exercise types and filter logic

**Files:**
- Create: `src/features/exercises/types.ts`
- Create: `src/features/exercises/filters.ts`
- Create: `src/features/exercises/filters.test.ts`

**Interfaces:**
- Produces: `Exercise`, `PersonalRecords`, `HistoryEntry`, `LeaderboardEntry` types (used by every remaining task); `filterExercises(exercises, filters): Exercise[]` (used by Task 8's list screen).

- [ ] **Step 1: Create the types**

Create `src/features/exercises/types.ts`:

```ts
export interface Exercise {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string | null;
  instructions: string[];
  images: string[];
  is_custom: boolean;
}

export interface PersonalRecords {
  heaviestWeight: number | null;
  best1RM: number | null;
  bestSetVolume: number | null;
  bestSessionVolume: number | null;
}

export interface HistorySet {
  weight: number | null;
  reps: number | null;
}

export interface HistoryEntry {
  sessionId: string;
  date: string;
  sets: HistorySet[];
}

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  heaviestWeight: number;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/exercises/filters.test.ts`:

```ts
import { filterExercises } from './filters';
import type { Exercise } from './types';

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    equipment: 'barbell',
    instructions: [],
    images: [],
    is_custom: false,
    ...overrides,
  };
}

describe('filterExercises', () => {
  const exercises: Exercise[] = [
    makeExercise({ id: '1', name: 'Bench Press', equipment: 'barbell', primary_muscles: ['chest'], secondary_muscles: ['triceps'] }),
    makeExercise({ id: '2', name: 'Squat', equipment: 'barbell', primary_muscles: ['quadriceps'], secondary_muscles: [] }),
    makeExercise({ id: '3', name: 'Push Up', equipment: 'body only', primary_muscles: ['chest'], secondary_muscles: [] }),
  ];

  it('returns everything when filters are empty', () => {
    const result = filterExercises(exercises, { search: '', equipment: null, muscle: null });
    expect(result.map((e) => e.id)).toEqual(['1', '2', '3']);
  });

  it('filters by case-insensitive name search', () => {
    const result = filterExercises(exercises, { search: 'bench', equipment: null, muscle: null });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  it('filters by equipment', () => {
    const result = filterExercises(exercises, { search: '', equipment: 'body only', muscle: null });
    expect(result.map((e) => e.id)).toEqual(['3']);
  });

  it('filters by primary or secondary muscle', () => {
    const result = filterExercises(exercises, { search: '', equipment: null, muscle: 'triceps' });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  it('combines all three filters', () => {
    const result = filterExercises(exercises, { search: 'press', equipment: 'barbell', muscle: 'chest' });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });
});
```

- [ ] **Step 3: Run the tests, confirm they fail**

Run: `npx jest src/features/exercises/filters.test.ts`
Expected: FAIL — `Cannot find module './filters'`

- [ ] **Step 4: Implement**

Create `src/features/exercises/filters.ts`:

```ts
import type { Exercise } from './types';

export interface ExerciseFilters {
  search: string;
  equipment: string | null;
  muscle: string | null;
}

function matchesSearch(exercise: Exercise, query: string): boolean {
  if (!query.trim()) return true;
  return exercise.name.toLowerCase().includes(query.trim().toLowerCase());
}

function matchesEquipment(exercise: Exercise, equipment: string | null): boolean {
  if (!equipment) return true;
  return exercise.equipment === equipment;
}

function matchesMuscle(exercise: Exercise, muscle: string | null): boolean {
  if (!muscle) return true;
  return exercise.primary_muscles.includes(muscle) || exercise.secondary_muscles.includes(muscle);
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
  return exercises.filter(
    (e) => matchesSearch(e, filters.search) && matchesEquipment(e, filters.equipment) && matchesMuscle(e, filters.muscle)
  );
}
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npx jest src/features/exercises/filters.test.ts`
Expected: PASS (5/5)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add exercise types and filter logic"
```

---

### Task 5: Exercise API functions

**Files:**
- Create: `src/features/exercises/api.ts`
- Create: `src/features/exercises/api.test.ts`

**Interfaces:**
- Consumes: `supabase` (Phase 1 Task 2), types from Task 4.
- Produces: `listExercises(): Promise<Exercise[]>`, `getExercise(id): Promise<Exercise | null>`, `getPersonalRecords(exerciseId): Promise<PersonalRecords>`, `getExerciseHistory(exerciseId): Promise<HistoryEntry[]>`, `getLeaderboard(exerciseId): Promise<LeaderboardEntry[]>`, `setLeaderboardOptIn(optIn): Promise<{ error: string | null }>` — used by Tasks 8-11.

- [ ] **Step 1: Write the failing tests**

Create `src/features/exercises/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import {
  listExercises,
  getExercise,
  getPersonalRecords,
  getExerciseHistory,
  getLeaderboard,
  setLeaderboardOptIn,
} from './api';

describe('listExercises', () => {
  it('returns exercises ordered by name', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Squat' }], error: null });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listExercises();

    expect(supabase.from).toHaveBeenCalledWith('exercises');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual([{ id: '1', name: 'Squat' }]);
  });
});

describe('getExercise', () => {
  it('returns a single exercise by id', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: '1', name: 'Squat' }, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExercise('1');

    expect(eq).toHaveBeenCalledWith('id', '1');
    expect(result).toEqual({ id: '1', name: 'Squat' });
  });

  it('returns null when not found', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExercise('missing');

    expect(result).toBeNull();
  });
});

describe('getPersonalRecords', () => {
  it('returns all-null records when there are no sets', async () => {
    const eq = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getPersonalRecords('ex-1');

    expect(result).toEqual({ heaviestWeight: null, best1RM: null, bestSetVolume: null, bestSessionVolume: null });
  });

  it('computes heaviest weight, best 1RM (Epley), best set volume, and best session volume', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [
        { weight: 100, reps: 5, session_id: 's1' },
        { weight: 80, reps: 10, session_id: 's1' },
        { weight: 110, reps: 3, session_id: 's2' },
      ],
      error: null,
    });
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getPersonalRecords('ex-1');

    expect(result.heaviestWeight).toBe(110);
    // Epley 1RM for 110kg x 3 reps = 110 * (1 + 3/30) = 121
    expect(result.best1RM).toBeCloseTo(121);
    // Best single-set volume: 100*5=500, 80*10=800, 110*3=330 -> 800
    expect(result.bestSetVolume).toBe(800);
    // Session s1 volume: 500+800=1300; session s2 volume: 330 -> best is 1300
    expect(result.bestSessionVolume).toBe(1300);
  });
});

describe('getExerciseHistory', () => {
  it('groups sets by session with each session\'s date', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { weight: 100, reps: 5, session_id: 's1', workout_sessions: { started_at: '2026-09-01T00:00:00Z' } },
        { weight: 105, reps: 3, session_id: 's1', workout_sessions: { started_at: '2026-09-01T00:00:00Z' } },
        { weight: 90, reps: 8, session_id: 's2', workout_sessions: { started_at: '2026-08-25T00:00:00Z' } },
      ],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExerciseHistory('ex-1');

    expect(result).toEqual([
      { sessionId: 's1', date: '2026-09-01T00:00:00Z', sets: [{ weight: 100, reps: 5 }, { weight: 105, reps: 3 }] },
      { sessionId: 's2', date: '2026-08-25T00:00:00Z', sets: [{ weight: 90, reps: 8 }] },
    ]);
  });

  it('returns an empty array when there is no history', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExerciseHistory('ex-1');

    expect(result).toEqual([]);
  });
});

describe('getLeaderboard', () => {
  it('maps RPC rows to LeaderboardEntry', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ user_id: 'u1', name: 'Alex', heaviest_weight: 120 }],
      error: null,
    });

    const result = await getLeaderboard('ex-1');

    expect(supabase.rpc).toHaveBeenCalledWith('get_exercise_leaderboard', { p_exercise_id: 'ex-1' });
    expect(result).toEqual([{ userId: 'u1', name: 'Alex', heaviestWeight: 120 }]);
  });

  it('returns an empty array on error', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await getLeaderboard('ex-1');

    expect(result).toEqual([]);
  });
});

describe('setLeaderboardOptIn', () => {
  it('updates the current user\'s opt-in flag', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const result = await setLeaderboardOptIn(true);

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(update).toHaveBeenCalledWith({ leaderboard_opt_in: true });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
    expect(result).toEqual({ error: null });
  });

  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await setLeaderboardOptIn(true);

    expect(result).toEqual({ error: 'Not authenticated' });
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/exercises/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement**

Create `src/features/exercises/api.ts`:

```ts
import { supabase } from '../../lib/supabase';
import type { Exercise, PersonalRecords, HistoryEntry, LeaderboardEntry } from './types';

interface WorkoutSetRow {
  weight: number | null;
  reps: number | null;
  session_id: string;
}

interface HistoryRow extends WorkoutSetRow {
  workout_sessions: { started_at: string } | null;
}

interface LeaderboardRow {
  user_id: string;
  name: string | null;
  heaviest_weight: number;
}

export async function listExercises(): Promise<Exercise[]> {
  const { data } = await supabase.from('exercises').select('*').order('name', { ascending: true });
  return (data ?? []) as Exercise[];
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data } = await supabase.from('exercises').select('*').eq('id', id).maybeSingle();
  return data as Exercise | null;
}

const emptyRecords: PersonalRecords = {
  heaviestWeight: null,
  best1RM: null,
  bestSetVolume: null,
  bestSessionVolume: null,
};

export async function getPersonalRecords(exerciseId: string): Promise<PersonalRecords> {
  const { data, error } = await supabase.from('workout_sets').select('weight, reps, session_id').eq('exercise_id', exerciseId);

  if (error || !data || data.length === 0) return emptyRecords;

  const sets = data as unknown as WorkoutSetRow[];

  const heaviestWeight = Math.max(...sets.map((s) => s.weight ?? 0));
  const best1RM = Math.max(...sets.map((s) => (s.weight ?? 0) * (1 + (s.reps ?? 0) / 30)));
  const bestSetVolume = Math.max(...sets.map((s) => (s.weight ?? 0) * (s.reps ?? 0)));

  const volumeBySession = new Map<string, number>();
  for (const s of sets) {
    const volume = (s.weight ?? 0) * (s.reps ?? 0);
    volumeBySession.set(s.session_id, (volumeBySession.get(s.session_id) ?? 0) + volume);
  }
  const bestSessionVolume = Math.max(...Array.from(volumeBySession.values()));

  return { heaviestWeight, best1RM, bestSetVolume, bestSessionVolume };
}

export async function getExerciseHistory(exerciseId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, session_id, workout_sessions(started_at)')
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as HistoryRow[];
  const bySession = new Map<string, HistoryEntry>();

  for (const row of rows) {
    if (!bySession.has(row.session_id)) {
      bySession.set(row.session_id, {
        sessionId: row.session_id,
        date: row.workout_sessions?.started_at ?? '',
        sets: [],
      });
    }
    bySession.get(row.session_id)!.sets.push({ weight: row.weight, reps: row.reps });
  }

  return Array.from(bySession.values());
}

export async function getLeaderboard(exerciseId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_exercise_leaderboard', { p_exercise_id: exerciseId });
  if (error || !data) return [];

  return (data as LeaderboardRow[]).map((row) => ({
    userId: row.user_id,
    name: row.name,
    heaviestWeight: row.heaviest_weight,
  }));
}

export async function setLeaderboardOptIn(optIn: boolean): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: 'Not authenticated' };

  const { error } = await supabase.from('users').update({ leaderboard_opt_in: optIn }).eq('id', session.user.id);
  return { error: error ? error.message : null };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/exercises/api.test.ts`
Expected: PASS (10/10)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add exercise API functions (list, detail, records, history, leaderboard)"
```

---

### Task 6: Member tab shell (Home / Workout / Profile placeholders)

**Files:**
- Modify: `src/components/Button.tsx` (add `disabled` prop)
- Modify: `app/(member)/_layout.tsx` (Stack → Tabs)
- Delete: `app/(member)/home.tsx` (Phase 1's bare welcome screen — its content moves to Task 7's `profile/index.tsx`)
- Create: `app/(member)/home.tsx` (new placeholder — same filename, new content)
- Create: `app/(member)/workout.tsx`
- Create: `src/components/__tests__/Button.test.tsx`

**Interfaces:**
- Produces: a 3-tab navigable shell. Task 7 supplies the `profile` tab's own nested layout.

- [ ] **Step 1: Write the failing test for the disabled Button**

Create `src/components/__tests__/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onPress when enabled and pressed', async () => {
    const onPress = jest.fn();
    await render(<Button title="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Tap me" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Tap me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test, confirm the disabled case fails**

Run: `npx jest src/components/__tests__/Button.test.tsx`
Expected: FAIL on the "does not call onPress when disabled" case — the current `Button` has no `disabled` prop, so `onPress` still fires.

- [ ] **Step 3: Add the `disabled` prop**

Modify `src/components/Button.tsx` — replace its full contents:

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingVertical: spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.m,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest src/components/__tests__/Button.test.tsx`
Expected: PASS (2/2)

- [ ] **Step 5: Convert the member layout to Tabs**

Replace the full contents of `app/(member)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';

export default function MemberTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Replace the Home tab with a placeholder**

Replace the full contents of `app/(member)/home.tsx`:

```tsx
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { typography } from '../../src/theme';

export default function Home() {
  return (
    <Screen>
      <Text style={typography.title}>Welcome back</Text>
      <Text style={typography.subtitle}>Your dashboard is coming soon.</Text>
    </Screen>
  );
}
```

- [ ] **Step 7: Create the Workout tab placeholder**

Create `app/(member)/workout.tsx`:

```tsx
import { Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { typography, spacing } from '../../src/theme';

export default function Workout() {
  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Workout</Text>
      <Button title="Start Empty Workout" onPress={() => {}} disabled />
      <Text style={[typography.subtitle, styles.note]}>Routines are coming soon.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  note: {
    marginTop: spacing.l,
  },
});
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: all suites pass (note: `profile` tab has no route files yet — that's fine, Task 7 adds them next; Expo Router itself isn't exercised by Jest, only the individual screen/component files are).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add member tab shell (Home/Workout placeholders) and Button disabled prop"
```

---

### Task 7: Profile stack and Profile home screen

**Files:**
- Create: `app/(member)/profile/_layout.tsx`
- Create: `app/(member)/profile/index.tsx`

**Interfaces:**
- Consumes: `signOut` (Phase 1 `src/features/auth/api.ts`), `Button` (Task 6).
- Produces: the `profile` tab referenced by Task 6's `_layout.tsx`; an "Exercises" entry point that Task 8's screen is pushed onto.

- [ ] **Step 1: Create the Profile stack layout**

Create `app/(member)/profile/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Create the Profile home screen**

Create `app/(member)/profile/index.tsx`:

```tsx
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../../src/features/auth/api';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { typography, spacing } from '../../../src/theme';

export default function ProfileHome() {
  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Profile</Text>
      <View style={styles.grid}>
        <Button title="Exercises" variant="secondary" onPress={() => router.push('/(member)/profile/exercises')} />
        <Button title="Statistics" variant="secondary" disabled onPress={() => {}} />
        <Button title="Measures" variant="secondary" disabled onPress={() => {}} />
        <Button title="Calendar" variant="secondary" disabled onPress={() => {}} />
      </View>
      <Button
        title="Sign Out"
        variant="secondary"
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.l,
  },
  grid: {
    gap: spacing.s,
  },
});
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all suites still pass (this task adds no new test files — it's a straightforward reuse of already-tested `Button` and already-tested `signOut`; manual verification of the actual navigation happens when the app is run, consistent with how Phase 1's route screens were handled).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Profile tab home screen with dashboard grid and sign out"
```

---

### Task 8: Exercise list screen

**Files:**
- Create: `app/(member)/profile/exercises/index.tsx`
- Create: `app/(member)/profile/exercises/__tests__/index.test.tsx`

**Interfaces:**
- Consumes: `listExercises` (Task 5), `filterExercises` (Task 4), `Exercise` type (Task 4).
- Produces: the list screen Task 9's detail screen is navigated to from.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/profile/exercises/__tests__/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../../src/features/exercises/api', () => ({
  listExercises: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { listExercises } from '../../../../../src/features/exercises/api';
import ExerciseList from '../index';

describe('ExerciseList', () => {
  it('renders exercises once loaded', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
      { id: '2', name: 'Squat', primary_muscles: ['quadriceps'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Squat')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest app/\(member\)/profile/exercises/__tests__/index.test.tsx`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: Implement**

Create `app/(member)/profile/exercises/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import { listExercises } from '../../../../src/features/exercises/api';
import { filterExercises } from '../../../../src/features/exercises/filters';
import type { Exercise } from '../../../../src/features/exercises/types';
import { typography, spacing, colors } from '../../../../src/theme';

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listExercises().then(setExercises);
  }, []);

  const filtered = filterExercises(exercises, { search, equipment: null, muscle: null });

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Exercises</Text>
      <TextField label="Search" placeholder="Search exercises" value={search} onChangeText={setSearch} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(member)/profile/exercises/${item.id}`)}>
            <Text style={typography.body}>{item.name}</Text>
            <Text style={typography.label}>{item.primary_muscles.join(', ')}</Text>
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
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest app/\(member\)/profile/exercises/__tests__/index.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add searchable exercise list screen"
```

---

### Task 9: Exercise detail screen shell and Summary tab

**Files:**
- Create: `src/features/exercises/components/SummaryTab.tsx`
- Create: `app/(member)/profile/exercises/[id].tsx`
- Create: `app/(member)/profile/exercises/__tests__/[id].test.tsx`

**Interfaces:**
- Consumes: `getExercise` (Task 5), `getPersonalRecords` (Task 5), `Exercise`/`PersonalRecords` types (Task 4).
- Produces: the tab-switching shell Tasks 10-11 plug their tab components into (`activeTab` state, `TABS` array).

- [ ] **Step 1: Create the Summary tab component**

Create `src/features/exercises/components/SummaryTab.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { getPersonalRecords } from '../api';
import type { Exercise, PersonalRecords } from '../types';
import { colors, radius, spacing, typography } from '../../../theme';

export function SummaryTab({ exercise }: { exercise: Exercise }) {
  const [records, setRecords] = useState<PersonalRecords | null>(null);

  useEffect(() => {
    getPersonalRecords(exercise.id).then(setRecords);
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
});
```

- [ ] **Step 2: Write the failing test for the detail screen shell**

Create `app/(member)/profile/exercises/__tests__/[id].test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

const mockExercise = {
  id: 'ex-1',
  name: 'Bench Press',
  primary_muscles: ['chest'],
  secondary_muscles: ['triceps'],
  equipment: 'barbell',
  instructions: ['Lie on the bench.', 'Press the bar up.'],
  images: [],
  is_custom: false,
};

jest.mock('../../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
  getPersonalRecords: jest.fn().mockResolvedValue({ heaviestWeight: null, best1RM: null, bestSetVolume: null, bestSessionVolume: null }),
  getExerciseHistory: jest.fn().mockResolvedValue([]),
  getLeaderboard: jest.fn().mockResolvedValue([]),
  setLeaderboardOptIn: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'ex-1' }),
}));

import { getExercise } from '../../../../../src/features/exercises/api';
import ExerciseDetail from '../[id]';

describe('ExerciseDetail', () => {
  it('renders the exercise name and defaults to the Summary tab', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Primary: chest')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/\[id\].test.tsx"`
Expected: FAIL — `Cannot find module '../[id]'`

- [ ] **Step 4: Implement the detail screen shell**

Create `app/(member)/profile/exercises/[id].tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { getExercise } from '../../../../src/features/exercises/api';
import type { Exercise } from '../../../../src/features/exercises/types';
import { SummaryTab } from '../../../../src/features/exercises/components/SummaryTab';
import { colors, spacing, typography } from '../../../../src/theme';

type TabKey = 'summary' | 'history' | 'howto' | 'leaderboard';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'history', label: 'History' },
  { key: 'howto', label: 'How to' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  useEffect(() => {
    if (id) getExercise(id).then(setExercise);
  }, [id]);

  if (!exercise) {
    return (
      <Screen>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>{exercise.name}</Text>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabItem}>
              <Text style={isActive ? styles.tabLabelActive : styles.tabLabelInactive}>{tab.label}</Text>
              {isActive && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>
      <ScrollView>{activeTab === 'summary' && <SummaryTab exercise={exercise} />}</ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    marginRight: spacing.l,
    paddingBottom: spacing.s,
  },
  tabLabelActive: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  tabLabelInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 15,
  },
  tabUnderline: {
    height: 2,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
    borderRadius: 1,
  },
});
```

Note: only the Summary tab is wired into the `ScrollView` for now — Task 10 and Task 11 add the `history`/`howto`/`leaderboard` branches.

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/\[id\].test.tsx"`
Expected: PASS

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add exercise detail screen shell with tab bar and Summary tab"
```

---

### Task 10: History and How-to tabs

**Files:**
- Create: `src/features/exercises/components/HistoryTab.tsx`
- Create: `src/features/exercises/components/HowToTab.tsx`
- Modify: `app/(member)/profile/exercises/[id].tsx` (wire in the two new tab branches)
- Modify: `app/(member)/profile/exercises/__tests__/[id].test.tsx` (add coverage for switching tabs)

**Interfaces:**
- Consumes: `getExerciseHistory` (Task 5), `Exercise.instructions` (Task 4).
- Produces: the `history`/`howto` branches the Task 9 shell renders.

- [ ] **Step 1: Create the History tab**

Create `src/features/exercises/components/HistoryTab.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { getExerciseHistory } from '../api';
import type { HistoryEntry } from '../types';
import { colors, radius, spacing, typography } from '../../../theme';

export function HistoryTab({ exerciseId }: { exerciseId: string }) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    getExerciseHistory(exerciseId).then(setHistory);
  }, [exerciseId]);

  if (history === null) return null;

  if (history.length === 0) {
    return <Text style={typography.subtitle}>No history yet.</Text>;
  }

  return (
    <View>
      {history.map((entry) => (
        <View key={entry.sessionId} style={styles.card}>
          <Text style={typography.label}>{new Date(entry.date).toLocaleDateString()}</Text>
          {entry.sets.map((set, index) => (
            <Text key={index} style={typography.body}>
              Set {index + 1}: {set.weight ?? '-'} kg x {set.reps ?? '-'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
});
```

- [ ] **Step 2: Create the How-to tab**

Create `src/features/exercises/components/HowToTab.tsx`:

```tsx
import { Text, View, StyleSheet } from 'react-native';
import type { Exercise } from '../types';
import { spacing, typography } from '../../../theme';

export function HowToTab({ exercise }: { exercise: Exercise }) {
  if (exercise.instructions.length === 0) {
    return <Text style={typography.subtitle}>No instructions available.</Text>;
  }

  return (
    <View>
      {exercise.instructions.map((step, index) => (
        <View key={index} style={styles.step}>
          <Text style={typography.label}>{index + 1}.</Text>
          <Text style={[typography.body, styles.stepText]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  stepText: {
    flex: 1,
    marginLeft: spacing.s,
  },
});
```

- [ ] **Step 3: Add a failing test for the How-to tab switch**

Add to `app/(member)/profile/exercises/__tests__/[id].test.tsx` (add the `fireEvent` import and this new test):

```tsx
import { fireEvent } from '@testing-library/react-native';
```

```tsx
it('shows instructions when the How to tab is selected', async () => {
  (getExercise as jest.Mock).mockResolvedValue(mockExercise);

  await render(<ExerciseDetail />);
  await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

  fireEvent.press(screen.getByText('How to'));

  await waitFor(() => expect(screen.getByText('Lie on the bench.')).toBeTruthy());
});
```

- [ ] **Step 4: Run the test, confirm the new one fails**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/\[id\].test.tsx"`
Expected: FAIL — the "How to" tab currently renders nothing, so `getByText('Lie on the bench.')` throws.

- [ ] **Step 5: Wire the two tabs into the detail screen**

Modify `app/(member)/profile/exercises/[id].tsx`:

Add these two imports alongside the existing `SummaryTab` import:

```tsx
import { HistoryTab } from '../../../../src/features/exercises/components/HistoryTab';
import { HowToTab } from '../../../../src/features/exercises/components/HowToTab';
```

Replace the `<ScrollView>` line:

```tsx
<ScrollView>
  {activeTab === 'summary' && <SummaryTab exercise={exercise} />}
  {activeTab === 'history' && <HistoryTab exerciseId={exercise.id} />}
  {activeTab === 'howto' && <HowToTab exercise={exercise} />}
</ScrollView>
```

- [ ] **Step 6: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/\[id\].test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add History and How-to tabs to exercise detail"
```

---

### Task 11: Leaderboard tab

**Files:**
- Create: `src/features/exercises/components/LeaderboardTab.tsx`
- Modify: `app/(member)/profile/exercises/[id].tsx` (wire in the leaderboard branch)
- Modify: `app/(member)/profile/exercises/__tests__/[id].test.tsx` (add coverage)

**Interfaces:**
- Consumes: `getLeaderboard`, `setLeaderboardOptIn` (Task 5), `Button` (Phase 1/Task 6).
- Produces: the final `leaderboard` branch, completing the Task 9 shell.

- [ ] **Step 1: Create the Leaderboard tab**

Create `src/features/exercises/components/LeaderboardTab.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { getLeaderboard, setLeaderboardOptIn } from '../api';
import type { LeaderboardEntry } from '../types';
import { Button } from '../../../components/Button';
import { colors, spacing, typography } from '../../../theme';

export function LeaderboardTab({ exerciseId }: { exerciseId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    getLeaderboard(exerciseId).then(setEntries);
  }, [exerciseId]);

  async function handleOptIn() {
    const { error } = await setLeaderboardOptIn(true);
    if (!error) {
      setOptedIn(true);
      getLeaderboard(exerciseId).then(setEntries);
    }
  }

  if (entries === null) return null;

  return (
    <View>
      {!optedIn && <Button title="Show me on leaderboards" variant="secondary" onPress={handleOptIn} />}
      {entries.length === 0 ? (
        <Text style={[typography.subtitle, styles.empty]}>No data yet.</Text>
      ) : (
        entries.map((entry, index) => (
          <View key={entry.userId} style={styles.row}>
            <Text style={typography.body}>
              {index + 1}. {entry.name ?? 'Member'}
            </Text>
            <Text style={typography.body}>{entry.heaviestWeight} kg</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: spacing.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.s,
  },
});
```

- [ ] **Step 2: Add a failing test for the Leaderboard tab switch**

Add to `app/(member)/profile/exercises/__tests__/[id].test.tsx`:

```tsx
it('shows leaderboard entries when the Leaderboard tab is selected', async () => {
  (getExercise as jest.Mock).mockResolvedValue(mockExercise);
  (getLeaderboard as jest.Mock).mockResolvedValue([{ userId: 'u1', name: 'Alex', heaviestWeight: 120 }]);

  await render(<ExerciseDetail />);
  await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

  fireEvent.press(screen.getByText('Leaderboard'));

  await waitFor(() => expect(screen.getByText('1. Alex')).toBeTruthy());
});
```

Also update the `jest.mock('../../../../../src/features/exercises/api', ...)` block at the top of the file to import `getLeaderboard` so the test can reference it:

```tsx
import { getExercise, getLeaderboard } from '../../../../../src/features/exercises/api';
```

- [ ] **Step 3: Run the test, confirm the new one fails**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/\[id\].test.tsx"`
Expected: FAIL — the "Leaderboard" tab currently renders nothing.

- [ ] **Step 4: Wire the leaderboard tab into the detail screen**

Modify `app/(member)/profile/exercises/[id].tsx`:

Add this import alongside the others:

```tsx
import { LeaderboardTab } from '../../../../src/features/exercises/components/LeaderboardTab';
```

Replace the `<ScrollView>` line:

```tsx
<ScrollView>
  {activeTab === 'summary' && <SummaryTab exercise={exercise} />}
  {activeTab === 'history' && <HistoryTab exerciseId={exercise.id} />}
  {activeTab === 'howto' && <HowToTab exercise={exercise} />}
  {activeTab === 'leaderboard' && <LeaderboardTab exerciseId={exercise.id} />}
</ScrollView>
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/\[id\].test.tsx"`
Expected: PASS (3/3)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Leaderboard tab with opt-in to exercise detail"
```

---

## Manual verification (after all tasks)

1. `npx supabase db push` against the hosted project (or repeat the manual-verification flow from Phase 1's plan if a fresh project is used).
2. Run the app, log in as an existing member, confirm the bottom tab bar now shows Home / Workout / Profile instead of the old bare welcome screen.
3. From Profile, tap Exercises — confirm the list loads real seeded exercises and search filters it.
4. Tap into an exercise (e.g. search "Farmer's Walk" to confirm the apostrophe-containing name displays correctly) — confirm all 4 tabs render: Summary shows muscles + "-" records, History shows "No history yet.", How-to shows numbered steps, Leaderboard shows "No data yet." and a "Show me on leaderboards" button.
5. Tap "Show me on leaderboards", confirm no error and the button disappears (opted in).
6. Sign out and back in as the same user — confirm Profile still shows the expected layout (Sign Out now lives there instead of a bare Home screen).
