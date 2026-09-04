# Phase 2b-1: Routines CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Workout tab's placeholder with real routine management — members can create, edit, and delete routines built from the exercise library, with target sets/rest per exercise, reordering, and superset grouping. Live logging (Phase 2b-2) and real chart data (Phase 2b-3) are explicitly out of scope; "Start Routine"/"Start Empty Workout" stay disabled.

**Architecture:** New `routine_exercises.superset_group` column (Phase 1's RLS already covers it via the existing routine-ownership policy — no new policy needed). App-side: pure array logic (reorder, superset grouping) in `src/features/routines/reorder.ts`, data access in `src/features/routines/api.ts`, a shared `RoutineExerciseList` component reused by both the New and Edit screens, and an exercise-picker mode added to Phase 2a's existing exercise list screen (route-param handoff, no new state library).

**Tech Stack:** Same as before, plus `victory-native@^36.9.2` (SVG-based, pre-Skia-rewrite — chosen for lower toolchain risk than the newer Skia-based major version) + `react-native-svg` for the routine detail chart.

**Spec:** `docs/superpowers/specs/2026-09-04-phase2b1-routines-crud-design.md`
**Parent specs:** `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`, `docs/superpowers/specs/2026-09-04-phase2a-exercise-library-design.md`

## Global Constraints

- TypeScript throughout, no `any` in new code.
- Navigation via Expo Router.
- Supabase is the only backend — access control enforced through RLS.
- `npm test` / `npx jest <path>` must keep working with no environment variables or CLI flags.
- Any test using `fireEvent.press` on a component with a mount-time async effect must `await` the press (established in Phase 2a after a real regression) — verify empirically per-component, don't assume either way.
- New third-party libraries (this phase: `victory-native`) must have their actual rendered/tested behavior verified against the installed version before being trusted — this project has repeatedly hit real gaps between a library's documented API and its behavior under the installed Expo SDK/React version. Document what you verified.

---

## File Structure

```
supabase/migrations/
  0007_routine_supersets.sql          # adds routine_exercises.superset_group

src/features/routines/
  types.ts                            # Routine, RoutineExercise, RoutineExerciseDraft, VolumeHistoryPoint
  reorder.ts                          # moveUp, moveDown, groupWithPrevious, ungroup (pure)
  reorder.test.ts
  api.ts                              # listRoutines, getRoutine, createRoutine, updateRoutine,
                                       # deleteRoutine, getRoutineVolumeHistory
  api.test.ts
  components/
    RoutineExerciseList.tsx           # shared editor UI, used by new.tsx and [id]/edit.tsx

app/(member)/
  workout.tsx                         # MODIFIED: real "My Routines" list instead of placeholder-only
  profile/exercises/index.tsx         # MODIFIED: adds exercise-picker mode
  routines/
    _layout.tsx                       # Stack
    new.tsx                           # create routine
    [id].tsx                          # routine detail (view + chart)
    [id]/
      edit.tsx                        # edit routine
```

---

### Task 1: Superset schema migration

**Files:**
- Create: `supabase/migrations/0007_routine_supersets.sql`

**Interfaces:**
- Produces: `routine_exercises.superset_group integer` (nullable). Tasks 3-11 consume this column name/type.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0007_routine_supersets.sql`:

```sql
alter table routine_exercises
  add column superset_group integer;
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db reset
npx supabase db query --local "select column_name, data_type from information_schema.columns where table_name = 'routine_exercises' and column_name = 'superset_group';"
```

Expected: `db reset` exits 0 with no `ERROR` lines; the query returns one row (`superset_group`, `integer`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_routine_supersets.sql
git commit -m "feat: add superset grouping column to routine_exercises"
```

---

### Task 2: Install charting library

**Files:**
- Modify: `package.json` (adds `victory-native`, `react-native-svg`)
- Create: `src/components/__tests__/SmokeChart.test.tsx` (temporary — proves the library renders under this project's Jest config; superseded by Task 10's real chart test)

**Interfaces:**
- Produces: a working `victory-native` install, verified to actually render under this project's test harness before any screen depends on it.

- [ ] **Step 1: Install**

```bash
npx expo install react-native-svg
npm install victory-native@^36.9.2
```

If `npm install` reports a peer-dependency conflict (this project has hit several in earlier phases — e.g. React 19 vs. a library's stated peer range), resolve it the same way earlier phases did: pin the specific compatible version or use `--legacy-peer-deps` for this one install, and document exactly what you did and why in your report. Do not silently downgrade React or other core packages to satisfy a peer range.

- [ ] **Step 2: Write a smoke test proving it renders**

Create `src/components/__tests__/SmokeChart.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';

describe('victory-native smoke test', () => {
  it('renders a basic bar chart without crashing', async () => {
    await render(
      <VictoryChart theme={VictoryTheme.material}>
        <VictoryAxis />
        <VictoryAxis dependentAxis />
        <VictoryBar data={[{ x: 'Mon', y: 10 }, { x: 'Tue', y: 20 }]} />
      </VictoryChart>
    );
    expect(screen.toJSON()).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run it, verify the actual behavior**

Run: `npx jest src/components/__tests__/SmokeChart.test.tsx`

If it passes cleanly (pristine, no warnings): note the exact import names and JSX shape that worked in your report — Task 10 will reuse this exact API.

If it fails or warns: investigate the actual installed `victory-native`/`react-native-svg` versions and their real API (check `node_modules/victory-native/package.json` and its type definitions) rather than guessing — find a working minimal chart render, update this test to match what actually works, and document the working shape precisely in your report so Task 10 can use it verbatim. Do not proceed to later tasks with a broken or warning chart render.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: install victory-native charting library, verified with a smoke test"
```

---

### Task 3: Routine types and reorder/superset logic

**Files:**
- Create: `src/features/routines/types.ts`
- Create: `src/features/routines/reorder.ts`
- Create: `src/features/routines/reorder.test.ts`

**Interfaces:**
- Produces: `Routine`, `RoutineExercise`, `RoutineExerciseDraft`, `VolumeHistoryPoint` types; `moveUp`, `moveDown`, `groupWithPrevious`, `ungroup` pure functions — used by Task 9's `RoutineExerciseList` component and Tasks 4-6's API functions.

- [ ] **Step 1: Create the types**

Create `src/features/routines/types.ts`:

```ts
export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface RoutineExerciseDraft {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface VolumeHistoryPoint {
  date: string;
  volume: number;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/routines/reorder.test.ts`:

```ts
import { moveUp, moveDown, groupWithPrevious, ungroup } from './reorder';
import type { RoutineExerciseDraft } from './types';

function draft(exerciseId: string, supersetGroup: number | null = null): RoutineExerciseDraft {
  return { exerciseId, exerciseName: exerciseId, targetSets: 3, restSeconds: 90, supersetGroup };
}

describe('moveUp', () => {
  it('swaps an item with the one above it', () => {
    const list = [draft('a'), draft('b'), draft('c')];
    expect(moveUp(list, 1).map((e) => e.exerciseId)).toEqual(['b', 'a', 'c']);
  });

  it('does nothing at index 0', () => {
    const list = [draft('a'), draft('b')];
    expect(moveUp(list, 0)).toEqual(list);
  });
});

describe('moveDown', () => {
  it('swaps an item with the one below it', () => {
    const list = [draft('a'), draft('b'), draft('c')];
    expect(moveDown(list, 1).map((e) => e.exerciseId)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing at the last index', () => {
    const list = [draft('a'), draft('b')];
    expect(moveDown(list, 1)).toEqual(list);
  });
});

describe('groupWithPrevious', () => {
  it('assigns a new group number to two ungrouped exercises', () => {
    const list = [draft('a'), draft('b')];
    const result = groupWithPrevious(list, 1);
    expect(result[0].supersetGroup).not.toBeNull();
    expect(result[0].supersetGroup).toBe(result[1].supersetGroup);
  });

  it('joins an existing group when the previous exercise already has one', () => {
    const list = [draft('a', 5), draft('b'), draft('c')];
    const result = groupWithPrevious(list, 1);
    expect(result[1].supersetGroup).toBe(5);
  });

  it('does nothing at index 0', () => {
    const list = [draft('a'), draft('b')];
    expect(groupWithPrevious(list, 0)).toEqual(list);
  });

  it('assigns a group number higher than any existing group', () => {
    const list = [draft('a', 3), draft('b'), draft('c', 1), draft('d')];
    const result = groupWithPrevious(list, 3);
    expect(result[3].supersetGroup).toBe(4);
  });
});

describe('ungroup', () => {
  it('clears the superset group for one exercise', () => {
    const list = [draft('a', 2), draft('b', 2)];
    const result = ungroup(list, 1);
    expect(result[0].supersetGroup).toBe(2);
    expect(result[1].supersetGroup).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests, confirm they fail**

Run: `npx jest src/features/routines/reorder.test.ts`
Expected: FAIL — `Cannot find module './reorder'`

- [ ] **Step 4: Implement**

Create `src/features/routines/reorder.ts`:

```ts
import type { RoutineExerciseDraft } from './types';

export function moveUp(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  if (index <= 0) return list;
  const next = [...list];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function moveDown(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  if (index >= list.length - 1) return list;
  const next = [...list];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

export function groupWithPrevious(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  if (index <= 0) return list;
  const next = [...list];
  const prevGroup = next[index - 1].supersetGroup;
  const maxGroup = Math.max(0, ...next.map((e) => e.supersetGroup ?? 0));
  const groupId = prevGroup ?? maxGroup + 1;
  next[index - 1] = { ...next[index - 1], supersetGroup: groupId };
  next[index] = { ...next[index], supersetGroup: groupId };
  return next;
}

export function ungroup(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  const next = [...list];
  next[index] = { ...next[index], supersetGroup: null };
  return next;
}
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npx jest src/features/routines/reorder.test.ts`
Expected: PASS (9/9)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add routine types and pure reorder/superset logic"
```

---

### Task 4: Routine API — list, get, delete

**Files:**
- Create: `src/features/routines/api.ts`
- Create: `src/features/routines/api.test.ts`

**Interfaces:**
- Consumes: `supabase` (Phase 1), `Routine`/`RoutineExercise` types (Task 3).
- Produces: `listRoutines(): Promise<{ id: string; name: string }[]>`, `getRoutine(id): Promise<Routine | null>`, `deleteRoutine(id): Promise<{ error: string | null }>` — used by Tasks 8, 10, 11.

- [ ] **Step 1: Write the failing tests**

Create `src/features/routines/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { listRoutines, getRoutine, deleteRoutine } from './api';

describe('listRoutines', () => {
  it('returns routines ordered by name', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'r1', name: 'Push Day' }], error: null });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listRoutines();

    expect(supabase.from).toHaveBeenCalledWith('routines');
    expect(select).toHaveBeenCalledWith('id, name');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual([{ id: 'r1', name: 'Push Day' }]);
  });
});

describe('getRoutine', () => {
  it('returns null when the routine does not exist', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getRoutine('missing');

    expect(result).toBeNull();
  });

  it('returns the routine with its ordered exercises', async () => {
    const routineMaybeSingle = jest.fn().mockResolvedValue({ data: { id: 'r1', name: 'Push Day' }, error: null });
    const routineEq = jest.fn(() => ({ maybeSingle: routineMaybeSingle }));
    const routineSelect = jest.fn(() => ({ eq: routineEq }));

    const exOrder = jest.fn().mockResolvedValue({
      data: [
        { id: 're1', exercise_id: 'ex1', order: 0, target_sets: 3, rest_seconds: 90, superset_group: null, exercises: { name: 'Bench Press' } },
      ],
      error: null,
    });
    const exEq = jest.fn(() => ({ order: exOrder }));
    const exSelect = jest.fn(() => ({ eq: exEq }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: routineSelect })
      .mockReturnValueOnce({ select: exSelect });

    const result = await getRoutine('r1');

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'routines');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'routine_exercises');
    expect(exEq).toHaveBeenCalledWith('routine_id', 'r1');
    expect(result).toEqual({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ],
    });
  });
});

describe('deleteRoutine', () => {
  it('deletes the routine by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const result = await deleteRoutine('r1');

    expect(supabase.from).toHaveBeenCalledWith('routines');
    expect(eq).toHaveBeenCalledWith('id', 'r1');
    expect(result).toEqual({ error: null });
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/routines/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement**

Create `src/features/routines/api.ts`:

```ts
import { supabase } from '../../lib/supabase';
import type { Routine, RoutineExercise, RoutineExerciseDraft, VolumeHistoryPoint } from './types';

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  rest_seconds: number;
  superset_group: number | null;
  exercises: { name: string } | null;
}

export async function listRoutines(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from('routines').select('id, name').order('name', { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const { data: routineRow } = await supabase.from('routines').select('id, name').eq('id', id).maybeSingle();
  if (!routineRow) return null;

  const { data } = await supabase
    .from('routine_exercises')
    .select('id, exercise_id, order, target_sets, rest_seconds, superset_group, exercises(name)')
    .eq('routine_id', id)
    .order('order', { ascending: true });

  const rows = (data ?? []) as unknown as RoutineExerciseRow[];

  const exercises: RoutineExercise[] = rows.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercises?.name ?? '',
    order: row.order,
    targetSets: row.target_sets,
    restSeconds: row.rest_seconds,
    supersetGroup: row.superset_group,
  }));

  return { id: (routineRow as { id: string; name: string }).id, name: (routineRow as { id: string; name: string }).name, exercises };
}

export async function deleteRoutine(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  return { error: error ? error.message : null };
}
```

Leave `createRoutine`, `updateRoutine`, and `getRoutineVolumeHistory` for Tasks 5-6 to add — do not stub them here.

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/routines/api.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add routine API (list, get, delete)"
```

---

### Task 5: Routine API — create, update

**Files:**
- Modify: `src/features/routines/api.ts` (add `createRoutine`, `updateRoutine`)
- Modify: `src/features/routines/api.test.ts` (add tests)

**Interfaces:**
- Consumes: `supabase`, `RoutineExerciseDraft` (Task 3).
- Produces: `createRoutine(name, exercises): Promise<{ id: string | null; error: string | null }>`, `updateRoutine(id, name, exercises): Promise<{ error: string | null }>` — used by Task 9 (New Routine) and Task 11 (Edit Routine).

- [ ] **Step 1: Write the failing tests**

Add to `src/features/routines/api.test.ts` (add the new imports to the existing `import { listRoutines, getRoutine, deleteRoutine } from './api';` line, making it `import { listRoutines, getRoutine, deleteRoutine, createRoutine, updateRoutine } from './api';`):

```ts
describe('createRoutine', () => {
  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await createRoutine('Push Day', []);

    expect(result).toEqual({ id: null, error: 'Not authenticated' });
  });

  it('creates the routine and its exercises in order', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

    const routineSingle = jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
    const routineSelect = jest.fn(() => ({ single: routineSingle }));
    const routineInsert = jest.fn(() => ({ select: routineSelect }));

    const exercisesInsert = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ insert: routineInsert })
      .mockReturnValueOnce({ insert: exercisesInsert });

    const drafts = [
      { exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 3, restSeconds: 90, supersetGroup: null },
      { exerciseId: 'ex2', exerciseName: 'Squat', targetSets: 5, restSeconds: 120, supersetGroup: null },
    ];

    const result = await createRoutine('Push Day', drafts);

    expect(routineInsert).toHaveBeenCalledWith({ owner_id: 'u1', name: 'Push Day' });
    expect(exercisesInsert).toHaveBeenCalledWith([
      { routine_id: 'r1', exercise_id: 'ex1', order: 0, target_sets: 3, rest_seconds: 90, superset_group: null },
      { routine_id: 'r1', exercise_id: 'ex2', order: 1, target_sets: 5, rest_seconds: 120, superset_group: null },
    ]);
    expect(result).toEqual({ id: 'r1', error: null });
  });
});

describe('updateRoutine', () => {
  it('updates the name, replaces the exercise list, and preserves order', async () => {
    const nameEq = jest.fn().mockResolvedValue({ error: null });
    const nameUpdate = jest.fn(() => ({ eq: nameEq }));

    const deleteEq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn(() => ({ eq: deleteEq }));

    const exercisesInsert = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ update: nameUpdate })
      .mockReturnValueOnce({ delete: del })
      .mockReturnValueOnce({ insert: exercisesInsert });

    const drafts = [{ exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 4, restSeconds: 60, supersetGroup: 1 }];

    const result = await updateRoutine('r1', 'Push Day v2', drafts);

    expect(nameUpdate).toHaveBeenCalledWith({ name: 'Push Day v2' });
    expect(nameEq).toHaveBeenCalledWith('id', 'r1');
    expect(deleteEq).toHaveBeenCalledWith('routine_id', 'r1');
    expect(exercisesInsert).toHaveBeenCalledWith([
      { routine_id: 'r1', exercise_id: 'ex1', order: 0, target_sets: 4, rest_seconds: 60, superset_group: 1 },
    ]);
    expect(result).toEqual({ error: null });
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/routines/api.test.ts`
Expected: FAIL — `createRoutine`/`updateRoutine` are not exported functions.

- [ ] **Step 3: Implement**

Add to `src/features/routines/api.ts`:

```ts
export async function createRoutine(
  name: string,
  exercises: RoutineExerciseDraft[]
): Promise<{ id: string | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { id: null, error: 'Not authenticated' };

  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .insert({ owner_id: session.user.id, name })
    .select('id')
    .single();

  if (routineError || !routine) {
    return { id: null, error: routineError ? routineError.message : 'Failed to create routine' };
  }

  const routineId = (routine as { id: string }).id;

  if (exercises.length > 0) {
    const rows = exercises.map((ex, index) => ({
      routine_id: routineId,
      exercise_id: ex.exerciseId,
      order: index,
      target_sets: ex.targetSets,
      rest_seconds: ex.restSeconds,
      superset_group: ex.supersetGroup,
    }));
    const { error: exercisesError } = await supabase.from('routine_exercises').insert(rows);
    if (exercisesError) return { id: routineId, error: exercisesError.message };
  }

  return { id: routineId, error: null };
}

export async function updateRoutine(
  id: string,
  name: string,
  exercises: RoutineExerciseDraft[]
): Promise<{ error: string | null }> {
  const { error: nameError } = await supabase.from('routines').update({ name }).eq('id', id);
  if (nameError) return { error: nameError.message };

  const { error: deleteError } = await supabase.from('routine_exercises').delete().eq('routine_id', id);
  if (deleteError) return { error: deleteError.message };

  if (exercises.length > 0) {
    const rows = exercises.map((ex, index) => ({
      routine_id: id,
      exercise_id: ex.exerciseId,
      order: index,
      target_sets: ex.targetSets,
      rest_seconds: ex.restSeconds,
      superset_group: ex.supersetGroup,
    }));
    const { error: insertError } = await supabase.from('routine_exercises').insert(rows);
    if (insertError) return { error: insertError.message };
  }

  return { error: null };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/routines/api.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add routine create and update API"
```

---

### Task 6: Routine API — volume history

**Files:**
- Modify: `src/features/routines/api.ts` (add `getRoutineVolumeHistory`)
- Modify: `src/features/routines/api.test.ts` (add tests)

**Interfaces:**
- Consumes: `supabase`, `VolumeHistoryPoint` type (Task 3).
- Produces: `getRoutineVolumeHistory(routineId): Promise<VolumeHistoryPoint[]>` — used by Task 10's routine detail chart.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/routines/api.test.ts` (update the import line to add `getRoutineVolumeHistory`):

```ts
describe('getRoutineVolumeHistory', () => {
  it('returns one point per session with total volume', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { started_at: '2026-09-01T00:00:00Z', workout_sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
        { started_at: '2026-09-03T00:00:00Z', workout_sets: [{ weight: 110, reps: 3 }] },
      ],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getRoutineVolumeHistory('r1');

    expect(supabase.from).toHaveBeenCalledWith('workout_sessions');
    expect(eq).toHaveBeenCalledWith('routine_id', 'r1');
    expect(result).toEqual([
      { date: '2026-09-01T00:00:00Z', volume: 1000 },
      { date: '2026-09-03T00:00:00Z', volume: 330 },
    ]);
  });

  it('returns an empty array when there are no sessions', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getRoutineVolumeHistory('r1');

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/routines/api.test.ts`
Expected: FAIL — `getRoutineVolumeHistory` is not an exported function.

- [ ] **Step 3: Implement**

Add to `src/features/routines/api.ts`:

```ts
interface VolumeHistoryRow {
  started_at: string;
  workout_sets: { weight: number | null; reps: number | null }[];
}

export async function getRoutineVolumeHistory(routineId: string): Promise<VolumeHistoryPoint[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, workout_sets(weight, reps)')
    .eq('routine_id', routineId)
    .order('started_at', { ascending: true });

  if (error || !data) return [];

  const rows = data as unknown as VolumeHistoryRow[];

  return rows.map((row) => ({
    date: row.started_at,
    volume: row.workout_sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0),
  }));
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/routines/api.test.ts`
Expected: PASS (8/8)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add routine volume history API for the detail chart"
```

---

### Task 7: Exercise picker mode

**Files:**
- Modify: `app/(member)/profile/exercises/index.tsx`
- Modify: `app/(member)/profile/exercises/__tests__/index.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: when navigated to with `pickMode=true` and a `returnTo` path, tapping a row pushes `returnTo` with an `addExerciseId` param instead of navigating to the exercise detail screen. Used by Task 9's "Add Exercise" button.

- [ ] **Step 1: Write the failing test**

Add to `app/(member)/profile/exercises/__tests__/index.test.tsx` (add `useLocalSearchParams` to the existing `jest.mock('expo-router', ...)` factory — change it to `jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})) }));`, and update the top-level import to `import { router, useLocalSearchParams } from 'expo-router';`):

```tsx
it('pushes to returnTo with addExerciseId when in pick mode', async () => {
  (listExercises as jest.Mock).mockResolvedValue([
    { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
  ]);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ pickMode: 'true', returnTo: '/(member)/routines/new' });

  await render(<ExerciseList />);

  await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
  fireEvent.press(screen.getByText('Bench Press'));

  expect(router.push).toHaveBeenCalledWith({ pathname: '/(member)/routines/new', params: { addExerciseId: '1' } });
});
```

Also add `fireEvent` to the top-level `@testing-library/react-native` import in that file if it isn't already imported there.

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/index.test.tsx"`
Expected: FAIL — either the mock shape mismatch or `router.push` not called with the pick-mode arguments (the screen doesn't yet branch on `pickMode`).

- [ ] **Step 3: Implement the picker branch**

Modify `app/(member)/profile/exercises/index.tsx`. Change the `expo-router` import line from `import { router } from 'expo-router';` to `import { router, useLocalSearchParams } from 'expo-router';`. Inside the component function, add:

```tsx
const { pickMode, returnTo } = useLocalSearchParams<{ pickMode?: string; returnTo?: string }>();
```

Replace the `renderItem` prop's `onPress` handler:

```tsx
renderItem={({ item }) => (
  <Pressable
    style={styles.row}
    onPress={() => {
      if (pickMode === 'true' && returnTo) {
        router.push({ pathname: returnTo, params: { addExerciseId: item.id } });
      } else {
        router.push(`/(member)/profile/exercises/${item.id}`);
      }
    }}
  >
    <Text style={typography.body}>{item.name}</Text>
    <Text style={typography.label}>{item.primary_muscles.join(', ')}</Text>
  </Pressable>
)}
```

- [ ] **Step 4: Run the test, confirm it and the existing test both pass**

Run: `npx jest "app/\(member\)/profile/exercises/__tests__/index.test.tsx"`
Expected: PASS (2/2) — the original "renders exercises once loaded" test must still pass with `useLocalSearchParams` mocked to return `{}` (its default from the updated mock factory), which falls through to the non-pick-mode branch unchanged.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add exercise picker mode to the exercise list screen"
```

---

### Task 8: Workout tab — real routines list

**Files:**
- Modify: `app/(member)/workout.tsx`
- Create: `app/(member)/__tests__/workout.test.tsx`

**Interfaces:**
- Consumes: `listRoutines` (Task 4).
- Produces: a real "My Routines" list; "New Routine" navigates to Task 9's screen; each row navigates to Task 10's routine detail screen.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/__tests__/workout.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../src/features/routines/api', () => ({
  listRoutines: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

import { listRoutines } from '../../../src/features/routines/api';
import Workout from '../workout';

describe('Workout', () => {
  it('renders the routines list once loaded', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);

    await render(<Workout />);

    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/__tests__/workout.test.tsx"`
Expected: FAIL — `screen.getByText('Push Day')` never appears (current `workout.tsx` has no routine list).

- [ ] **Step 3: Implement**

Replace the full contents of `app/(member)/workout.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { listRoutines } from '../../src/features/routines/api';
import { typography, spacing, colors } from '../../src/theme';

export default function Workout() {
  const [routines, setRoutines] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    listRoutines().then(setRoutines);
  }, []);

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Workout</Text>
      <Button title="Start Empty Workout" onPress={() => {}} disabled />
      <Text style={[typography.title, styles.sectionHeading]}>Routines</Text>
      <Button title="New Routine" variant="secondary" onPress={() => router.push('/(member)/routines/new')} />
      <Button title="Explore" variant="secondary" onPress={() => {}} disabled />
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(member)/routines/${item.id}`)}>
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

Run: `npx jest "app/\(member\)/__tests__/workout.test.tsx"`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace Workout tab placeholder with real routines list"
```

---

### Task 9: Shared exercise editor and New Routine screen

**Files:**
- Create: `src/features/routines/components/RoutineExerciseList.tsx`
- Create: `app/(member)/routines/_layout.tsx`
- Create: `app/(member)/routines/new.tsx`
- Create: `app/(member)/routines/__tests__/new.test.tsx`

**Interfaces:**
- Consumes: `moveUp`/`moveDown`/`groupWithPrevious`/`ungroup` (Task 3), `createRoutine` (Task 5), `getExercise` (Phase 2a), `RoutineExerciseDraft` type (Task 3).
- Produces: `RoutineExerciseList` — reused by Task 11's edit screen.

- [ ] **Step 1: Create the shared exercise editor**

Create `src/features/routines/components/RoutineExerciseList.tsx`:

```tsx
import { Text, View, StyleSheet } from 'react-native';
import type { RoutineExerciseDraft } from '../types';
import { moveUp, moveDown, groupWithPrevious, ungroup } from '../reorder';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface RoutineExerciseListProps {
  exercises: RoutineExerciseDraft[];
  onChange: (exercises: RoutineExerciseDraft[]) => void;
}

export function RoutineExerciseList({ exercises, onChange }: RoutineExerciseListProps) {
  function updateAt(index: number, patch: Partial<RoutineExerciseDraft>) {
    const next = [...exercises];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(exercises.filter((_, i) => i !== index));
  }

  return (
    <View>
      {exercises.map((ex, index) => (
        <View key={`${ex.exerciseId}-${index}`} style={styles.row}>
          <Text style={typography.body}>{ex.exerciseName}</Text>
          {ex.supersetGroup != null && <Text style={typography.label}>Superset {ex.supersetGroup}</Text>}
          <View style={styles.controlRow}>
            <Text style={typography.label}>Sets: {ex.targetSets}</Text>
            <Button title="-" variant="secondary" onPress={() => updateAt(index, { targetSets: Math.max(1, ex.targetSets - 1) })} />
            <Button title="+" variant="secondary" onPress={() => updateAt(index, { targetSets: ex.targetSets + 1 })} />
          </View>
          <View style={styles.controlRow}>
            <Text style={typography.label}>Rest: {ex.restSeconds}s</Text>
            <Button title="-" variant="secondary" onPress={() => updateAt(index, { restSeconds: Math.max(0, ex.restSeconds - 15) })} />
            <Button title="+" variant="secondary" onPress={() => updateAt(index, { restSeconds: ex.restSeconds + 15 })} />
          </View>
          <View style={styles.controlRow}>
            <Button title="Up" variant="secondary" onPress={() => onChange(moveUp(exercises, index))} />
            <Button title="Down" variant="secondary" onPress={() => onChange(moveDown(exercises, index))} />
            <Button
              title={ex.supersetGroup != null ? 'Ungroup' : 'Group with above'}
              variant="secondary"
              onPress={() => onChange(ex.supersetGroup != null ? ungroup(exercises, index) : groupWithPrevious(exercises, index))}
            />
            <Button title="Remove" variant="secondary" onPress={() => removeAt(index)} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.s,
  },
});
```

- [ ] **Step 2: Create the routines Stack layout**

Create `app/(member)/routines/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RoutinesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Write the failing test for New Routine**

Create `app/(member)/routines/__tests__/new.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/routines/api', () => ({
  createRoutine: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

import { createRoutine } from '../../../../src/features/routines/api';
import { getExercise } from '../../../../src/features/exercises/api';
import { useLocalSearchParams, router } from 'expo-router';
import NewRoutine from '../new';

describe('NewRoutine', () => {
  it('adds an exercise passed via addExerciseId and saves the routine', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ addExerciseId: 'ex1' });
    (getExercise as jest.Mock).mockResolvedValue({ id: 'ex1', name: 'Bench Press' });
    (createRoutine as jest.Mock).mockResolvedValue({ id: 'r1', error: null });

    await render(<NewRoutine />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText('Routine name'), 'Push Day');
    await fireEvent.press(screen.getByText('Save'));

    expect(createRoutine).toHaveBeenCalledWith('Push Day', [
      { exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 3, restSeconds: 90, supersetGroup: null },
    ]);
    expect(router.replace).toHaveBeenCalledWith('/(member)/routines/r1');
  });
});
```

- [ ] **Step 4: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/routines/__tests__/new.test.tsx"`
Expected: FAIL — `Cannot find module '../new'`

- [ ] **Step 5: Implement the New Routine screen**

Create `app/(member)/routines/new.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { Button } from '../../../src/components/Button';
import { RoutineExerciseList } from '../../../src/features/routines/components/RoutineExerciseList';
import { createRoutine } from '../../../src/features/routines/api';
import { getExercise } from '../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../src/features/routines/types';
import { spacing } from '../../../src/theme';

export default function NewRoutine() {
  const { addExerciseId } = useLocalSearchParams<{ addExerciseId?: string }>();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);

  useEffect(() => {
    if (!addExerciseId) return;
    getExercise(addExerciseId).then((exercise) => {
      if (!exercise) return;
      setExercises((prev) => [
        ...prev,
        { exerciseId: exercise.id, exerciseName: exercise.name, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ]);
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId]);

  async function handleSave() {
    const { id } = await createRoutine(name, exercises);
    if (id) router.replace(`/(member)/routines/${id}`);
  }

  return (
    <Screen>
      <TextField label="Name" placeholder="Routine name" value={name} onChangeText={setName} />
      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() => router.push({ pathname: '/(member)/profile/exercises', params: { pickMode: 'true', returnTo: '/(member)/routines/new' } })}
      />
      <RoutineExerciseList exercises={exercises} onChange={setExercises} />
      <Button title="Save" onPress={handleSave} style={styles.saveButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  saveButton: {
    marginTop: spacing.l,
  },
});
```

Note: `Button` does not currently accept a `style` prop — if `npx tsc --noEmit` reports this as an error, remove the `style={styles.saveButton}` prop and the unused `styles`/`StyleSheet` import rather than modifying the shared `Button` component (a style-prop addition to `Button` is out of scope for this task).

- [ ] **Step 6: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/routines/__tests__/new.test.tsx"`
Expected: PASS

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add shared routine exercise editor and New Routine screen"
```

---

### Task 10: Routine detail screen

**Files:**
- Create: `app/(member)/routines/[id].tsx`
- Create: `app/(member)/routines/__tests__/[id].test.tsx`

**Interfaces:**
- Consumes: `getRoutine` (Task 4), `getRoutineVolumeHistory` (Task 6), `victory-native` (Task 2 — use the exact working API shape Task 2's report documented).
- Produces: the detail screen Task 9's save flow and Task 8's routine-row taps navigate to.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/routines/__tests__/[id].test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/routines/api', () => ({
  getRoutine: jest.fn(),
  getRoutineVolumeHistory: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'r1' }),
  router: { push: jest.fn() },
}));

import { getRoutine } from '../../../../src/features/routines/api';
import RoutineDetail from '../[id]';

describe('RoutineDetail', () => {
  it('renders the routine name and its exercises', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ],
    });

    await render(<RoutineDetail />);

    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/routines/__tests__/\[id\].test.tsx"`
Expected: FAIL — `Cannot find module '../[id]'`

- [ ] **Step 3: Implement**

Create `app/(member)/routines/[id].tsx`. Use the exact `victory-native` import/JSX shape Task 2's report documented as actually working — the code below is the expected shape but Task 2 may have found a different working API; if so, use that instead and note the substitution in your report:

```tsx
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { getRoutine, getRoutineVolumeHistory } from '../../../src/features/routines/api';
import type { Routine, VolumeHistoryPoint } from '../../../src/features/routines/types';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function RoutineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [history, setHistory] = useState<VolumeHistoryPoint[]>([]);

  useEffect(() => {
    if (!id) return;
    getRoutine(id).then(setRoutine);
    getRoutineVolumeHistory(id).then(setHistory);
  }, [id]);

  if (!routine) {
    return (
      <Screen>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>{routine.name}</Text>
      <Button title="Start Routine" onPress={() => {}} disabled />
      <Button title="Edit Routine" variant="secondary" onPress={() => router.push(`/(member)/routines/${routine.id}/edit`)} />
      <View style={styles.chartCard}>
        {history.length === 0 ? (
          <Text style={typography.subtitle}>No data yet.</Text>
        ) : (
          <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryBar data={history.map((h) => ({ x: h.date, y: h.volume }))} />
          </VictoryChart>
        )}
      </View>
      <Text style={[typography.title, styles.sectionHeading]}>Exercises</Text>
      {routine.exercises.map((ex) => (
        <View key={ex.id} style={styles.exerciseRow}>
          <Text style={typography.body}>{ex.exerciseName}</Text>
          <Text style={typography.label}>
            {ex.targetSets} sets{ex.supersetGroup != null ? ` · Superset ${ex.supersetGroup}` : ''}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginTop: spacing.l,
    minHeight: 120,
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  exerciseRow: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/routines/__tests__/\[id\].test.tsx"`
Expected: PASS. If the `victory-native` import causes a render error under Jest even though Task 2's smoke test passed (e.g. a different code path is exercised because `history.length === 0` here, which doesn't render the chart at all in this specific test's fixture) — that's expected and fine; this test doesn't need real history data to pass, since the fixture's `getRoutineVolumeHistory` mock resolves to `[]`.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add routine detail screen with volume chart"
```

---

### Task 11: Edit Routine screen

**Files:**
- Create: `app/(member)/routines/[id]/edit.tsx`
- Create: `app/(member)/routines/[id]/__tests__/edit.test.tsx`

**Interfaces:**
- Consumes: `getRoutine`, `updateRoutine`, `deleteRoutine` (Task 4/5), `RoutineExerciseList` (Task 9).
- Produces: the screen Task 10's "Edit Routine" button navigates to.

- [ ] **Step 1: Write the failing test**

Create `app/(member)/routines/[id]/__tests__/edit.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../src/features/routines/api', () => ({
  getRoutine: jest.fn(),
  updateRoutine: jest.fn(),
  deleteRoutine: jest.fn(),
}));

jest.mock('../../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'r1' })),
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
}));

import { getRoutine, updateRoutine, deleteRoutine } from '../../../../../src/features/routines/api';
import { router } from 'expo-router';
import EditRoutine from '../edit';

describe('EditRoutine', () => {
  it('loads the existing routine, saves changes, and deletes on request', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ],
    });
    (updateRoutine as jest.Mock).mockResolvedValue({ error: null });
    (deleteRoutine as jest.Mock).mockResolvedValue({ error: null });

    await render(<EditRoutine />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText('Routine name'), 'Push Day v2');
    await fireEvent.press(screen.getByText('Save'));

    expect(updateRoutine).toHaveBeenCalledWith('r1', 'Push Day v2', [
      { exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 3, restSeconds: 90, supersetGroup: null },
    ]);
    expect(router.replace).toHaveBeenCalledWith('/(member)/routines/r1');

    await fireEvent.press(screen.getByText('Delete Routine'));

    expect(deleteRoutine).toHaveBeenCalledWith('r1');
    expect(router.replace).toHaveBeenCalledWith('/(member)/workout');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/routines/\[id\]/__tests__/edit.test.tsx"`
Expected: FAIL — `Cannot find module '../edit'`

- [ ] **Step 3: Implement**

Create `app/(member)/routines/[id]/edit.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import { Button } from '../../../../src/components/Button';
import { RoutineExerciseList } from '../../../../src/features/routines/components/RoutineExerciseList';
import { getRoutine, updateRoutine, deleteRoutine } from '../../../../src/features/routines/api';
import { getExercise } from '../../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../../src/features/routines/types';

export default function EditRoutine() {
  const { id, addExerciseId } = useLocalSearchParams<{ id: string; addExerciseId?: string }>();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);

  useEffect(() => {
    if (!id) return;
    getRoutine(id).then((routine) => {
      if (!routine) return;
      setName(routine.name);
      setExercises(
        routine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          targetSets: ex.targetSets,
          restSeconds: ex.restSeconds,
          supersetGroup: ex.supersetGroup,
        }))
      );
    });
  }, [id]);

  useEffect(() => {
    if (!addExerciseId) return;
    getExercise(addExerciseId).then((exercise) => {
      if (!exercise) return;
      setExercises((prev) => [
        ...prev,
        { exerciseId: exercise.id, exerciseName: exercise.name, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ]);
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId]);

  async function handleSave() {
    const { error } = await updateRoutine(id, name, exercises);
    if (!error) router.replace(`/(member)/routines/${id}`);
  }

  async function handleDelete() {
    const { error } = await deleteRoutine(id);
    if (!error) router.replace('/(member)/workout');
  }

  return (
    <Screen>
      <TextField label="Name" placeholder="Routine name" value={name} onChangeText={setName} />
      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/(member)/profile/exercises', params: { pickMode: 'true', returnTo: `/(member)/routines/${id}/edit` } })
        }
      />
      <RoutineExerciseList exercises={exercises} onChange={setExercises} />
      <Button title="Save" onPress={handleSave} />
      <Button title="Delete Routine" variant="secondary" onPress={handleDelete} />
    </Screen>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/routines/\[id\]/__tests__/edit.test.tsx"`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass, pristine output.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Edit Routine screen with save and delete"
```

---

## Manual verification (after all tasks)

1. `npx supabase db push` against the hosted project.
2. From the Workout tab, tap "New Routine", add 2-3 exercises via "Add Exercise", set target sets/rest, group two into a superset, save.
3. Confirm the routine appears in "My Routines" and opening it shows the exercises, superset label, and an empty-state chart ("No data yet.").
4. Tap "Edit Routine", change the name, remove an exercise, save — confirm changes persist.
5. Tap "Delete Routine" — confirm it's removed from "My Routines".
