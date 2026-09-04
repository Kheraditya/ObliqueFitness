# Phase 2b-2: Live Workout Logging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable "Start Empty Workout" and "Start Routine" (disabled since Phase 2a/2b-1) by building a real Active Workout screen that logs sets to Phase 1's existing `workout_sessions`/`workout_sets` tables — the same tables Phase 2a's History/Personal-Records/Leaderboard and Phase 2b-1's volume chart already query but have never had real data to show.

**Architecture:** No schema changes. The session-exercise list is derived server-side (union of the session's routine's exercises, if any, plus any exercise with at least one logged set) rather than persisted in a new table. Rest-timer sequencing (skip the timer between paired superset exercises, start it otherwise) is a pure, testable function. The Active Workout screen lives at `app/(member)/active-workout/[sessionId].tsx` — a new directory sibling to `routines/`, requiring the same `href: null` tab-hiding treatment `routines/` needed in the prior phase's final review, applied here from the start. The screen also applies Phase 2b-1's hard-won fix pattern proactively: an `addExerciseId`-driven "add exercise mid-session" effect is gated behind a `loaded` flag so it cannot race the initial session-load effect and silently drop an appended exercise (the exact bug Phase 2b-1's Task 11 had to fix after the fact).

**Tech Stack:** Adds `expo-haptics` (vibration feedback when a rest timer completes).

**Spec:** `docs/superpowers/specs/2026-09-04-phase2b2-live-workout-logging-design.md`
**Parent specs:** `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`, `docs/superpowers/specs/2026-09-04-phase2b1-routines-crud-design.md`

## Global Constraints

- TypeScript throughout, no `any` in new code.
- Navigation via Expo Router.
- Supabase is the only backend — access control enforced through RLS. This phase's `workout_sessions`/`workout_sets` writes rely entirely on Phase 1's existing `workout_sessions_owner`/`workout_sets_owner` policies — no new policies, no new `security definer` function (nothing here reads across users).
- `npm test` / `npx jest <path>` must keep working with no environment variables or CLI flags.
- Any new route directory placed directly under `app/(member)/` MUST be explicitly hidden from the tab bar (`<Tabs.Screen name="..." options={{ href: null }} />` in `app/(member)/_layout.tsx`) in the SAME task that creates it — a prior phase shipped a stray visible tab because this was done as an afterthought instead.
- Any screen with two or more effects where one loads existing server data and another appends client-driven additions (e.g. an "add item mid-flow" pattern) MUST gate the appending effect behind a `loaded` flag set only after the initial load completes — a prior phase shipped a real data-loss race from skipping this.
- `fireEvent.press`/`fireEvent.changeText` must be `await`ed in tests whenever the pressed/changed component has async state or effects in flight — verify per-component empirically, do not assume either way (this project has found real, verified bugs both from blindly awaiting everything and from blindly awaiting nothing).

---

## File Structure

```
src/features/workout/
  types.ts                             # SessionExercise, LoggedSet
  restTimer.ts                         # shouldStartRestTimer (pure)
  restTimer.test.ts
  api.ts                                # startSession, getSessionExercises, getLoggedSets,
                                        # logSet, updateWorkoutSet, finishSession
  api.test.ts
  components/
    RestTimerBanner.tsx
    RestTimerBanner.test.tsx
    SessionExerciseCard.tsx
    SessionExerciseCard.test.tsx

app/(member)/
  _layout.tsx                          # MODIFIED: add active-workout Tabs.Screen (href: null)
  active-workout/
    _layout.tsx                        # Stack
    [sessionId].tsx                    # the live logging screen
    __tests__/
      [sessionId].test.tsx
  workout.tsx                          # MODIFIED: enable "Start Empty Workout"
  routines/[id].tsx                    # MODIFIED: enable "Start Routine"
```

---

### Task 1: Install expo-haptics

**Files:**
- Modify: `package.json` (adds `expo-haptics`)
- Create: `src/features/workout/components/__tests__/HapticsSmoke.test.tsx` (temporary — proves the module mocks cleanly under this project's Jest config; deleted once Task 5's real component test covers the same ground)

**Interfaces:**
- Produces: a working `expo-haptics` install, verified under this project's test harness before Task 5 depends on it.

- [ ] **Step 1: Install**

```bash
npx expo install expo-haptics
```

- [ ] **Step 2: Write a smoke test proving it mocks cleanly under Jest**

Create `src/features/workout/components/__tests__/HapticsSmoke.test.tsx`:

```tsx
import * as Haptics from 'expo-haptics';

describe('expo-haptics smoke test', () => {
  it('module loads and its functions are callable under Jest', async () => {
    await expect(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 3: Run it, verify the actual behavior**

Run: `npx jest src/features/workout/components/__tests__/HapticsSmoke.test.tsx`

If it passes cleanly (pristine, no warnings, no need for a `jest.mock('expo-haptics', ...)` — `jest-expo`'s preset auto-mocks most Expo native modules including this one): good, no further action needed here.

If it fails (e.g. a native-module-not-mocked error): investigate the actual failure (check whether `jest-expo`'s default mock registry covers `expo-haptics` for the installed SDK version) rather than guessing, add a `jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 'success' } }))` to this test file if a manual mock is genuinely required, and document in your report exactly what you found — Task 5 needs to know whether it must add the same manual mock to its own test file.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all suites pass, pristine.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: install expo-haptics, verified with a smoke test"
```

---

### Task 2: Workout types and rest-timer logic

**Files:**
- Create: `src/features/workout/types.ts`
- Create: `src/features/workout/restTimer.ts`
- Create: `src/features/workout/restTimer.test.ts`

**Interfaces:**
- Produces: `SessionExercise`, `LoggedSet` types; `shouldStartRestTimer(exercises, currentIndex): boolean` — used by Task 7's Active Workout screen.

- [ ] **Step 1: Create the types**

Create `src/features/workout/types.ts`:

```ts
export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  restSeconds: number;
  supersetGroup: number | null;
}

export interface LoggedSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/workout/restTimer.test.ts`:

```ts
import { shouldStartRestTimer } from './restTimer';
import type { SessionExercise } from './types';

function exercise(overrides: Partial<SessionExercise>): SessionExercise {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Bench Press',
    order: 0,
    restSeconds: 90,
    supersetGroup: null,
    ...overrides,
  };
}

describe('shouldStartRestTimer', () => {
  it('returns true for a standalone exercise followed by another standalone exercise', () => {
    const list = [exercise({ exerciseId: 'a' }), exercise({ exerciseId: 'b' })];
    expect(shouldStartRestTimer(list, 0)).toBe(true);
  });

  it('returns false when the next exercise shares the same superset group', () => {
    const list = [
      exercise({ exerciseId: 'a', supersetGroup: 1 }),
      exercise({ exerciseId: 'b', supersetGroup: 1 }),
    ];
    expect(shouldStartRestTimer(list, 0)).toBe(false);
  });

  it('returns true for the last exercise in a superset group (next is a different group)', () => {
    const list = [
      exercise({ exerciseId: 'a', supersetGroup: 1 }),
      exercise({ exerciseId: 'b', supersetGroup: 1 }),
      exercise({ exerciseId: 'c', supersetGroup: 2 }),
    ];
    expect(shouldStartRestTimer(list, 1)).toBe(true);
  });

  it('returns true for the last exercise in the whole list', () => {
    const list = [exercise({ exerciseId: 'a' })];
    expect(shouldStartRestTimer(list, 0)).toBe(true);
  });

  it('returns true when the current exercise has no superset group, even if unrelated data looks odd', () => {
    const list = [exercise({ exerciseId: 'a', supersetGroup: null }), exercise({ exerciseId: 'b', supersetGroup: 2 })];
    expect(shouldStartRestTimer(list, 0)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests, confirm they fail**

Run: `npx jest src/features/workout/restTimer.test.ts`
Expected: FAIL — `Cannot find module './restTimer'`

- [ ] **Step 4: Implement**

Create `src/features/workout/restTimer.ts`:

```ts
import type { SessionExercise } from './types';

export function shouldStartRestTimer(exercises: SessionExercise[], currentIndex: number): boolean {
  const current = exercises[currentIndex];
  const next = exercises[currentIndex + 1];
  if (!next) return true;
  if (current.supersetGroup != null && next.supersetGroup === current.supersetGroup) {
    return false;
  }
  return true;
}
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npx jest src/features/workout/restTimer.test.ts`
Expected: PASS (5/5)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add workout types and rest-timer sequencing logic"
```

---

### Task 3: Workout API — start session, session exercises, logged sets

**Files:**
- Create: `src/features/workout/api.ts`
- Create: `src/features/workout/api.test.ts`

**Interfaces:**
- Consumes: `supabase` (Phase 1), `SessionExercise`/`LoggedSet` types (Task 2).
- Produces: `startSession(routineId): Promise<{ id: string | null; error: string | null }>`, `getSessionExercises(sessionId): Promise<{ exercises: SessionExercise[]; startedAt: string }>`, `getLoggedSets(sessionId): Promise<LoggedSet[]>` — used by Task 7 (screen) and Tasks 8-9 (start buttons).

- [ ] **Step 1: Write the failing tests**

Create `src/features/workout/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { startSession, getSessionExercises, getLoggedSets } from './api';

describe('startSession', () => {
  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await startSession(null);

    expect(result).toEqual({ id: null, error: 'Not authenticated' });
  });

  it('inserts a workout_sessions row for the current user', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    const single = jest.fn().mockResolvedValue({ data: { id: 's1' }, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const result = await startSession('r1');

    expect(supabase.from).toHaveBeenCalledWith('workout_sessions');
    expect(insert).toHaveBeenCalledWith({ user_id: 'u1', routine_id: 'r1' });
    expect(result).toEqual({ id: 's1', error: null });
  });
});

describe('getSessionExercises', () => {
  it('derives exercises from the routine when the session has one', async () => {
    const sessionMaybeSingle = jest.fn().mockResolvedValue({
      data: { routine_id: 'r1', started_at: '2026-09-04T00:00:00Z' },
      error: null,
    });
    const sessionEq = jest.fn(() => ({ maybeSingle: sessionMaybeSingle }));
    const sessionSelect = jest.fn(() => ({ eq: sessionEq }));

    const routineOrder = jest.fn().mockResolvedValue({
      data: [
        { exercise_id: 'ex1', order: 0, rest_seconds: 90, superset_group: null, exercises: { name: 'Bench Press' } },
      ],
      error: null,
    });
    const routineEq = jest.fn(() => ({ order: routineOrder }));
    const routineSelect = jest.fn(() => ({ eq: routineEq }));

    const setsEq = jest.fn().mockResolvedValue({ data: [], error: null });
    const setsSelect = jest.fn(() => ({ eq: setsEq }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: sessionSelect })
      .mockReturnValueOnce({ select: routineSelect })
      .mockReturnValueOnce({ select: setsSelect });

    const result = await getSessionExercises('s1');

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'workout_sessions');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'routine_exercises');
    expect(supabase.from).toHaveBeenNthCalledWith(3, 'workout_sets');
    expect(result).toEqual({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
  });

  it('adds an ad-hoc exercise that already has a logged set but is not in the routine', async () => {
    const sessionMaybeSingle = jest.fn().mockResolvedValue({
      data: { routine_id: null, started_at: '2026-09-04T00:00:00Z' },
      error: null,
    });
    const sessionEq = jest.fn(() => ({ maybeSingle: sessionMaybeSingle }));
    const sessionSelect = jest.fn(() => ({ eq: sessionEq }));

    const setsEq = jest.fn().mockResolvedValue({
      data: [{ exercise_id: 'ex2', exercises: { name: 'Squat' } }],
      error: null,
    });
    const setsSelect = jest.fn(() => ({ eq: setsEq }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: sessionSelect })
      .mockReturnValueOnce({ select: setsSelect });

    const result = await getSessionExercises('s1');

    expect(result).toEqual({
      exercises: [{ exerciseId: 'ex2', exerciseName: 'Squat', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
  });
});

describe('getLoggedSets', () => {
  it('returns sets ordered by set number', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'set1', exercise_id: 'ex1', set_number: 1, weight: 100, reps: 5, rpe: null }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getLoggedSets('s1');

    expect(supabase.from).toHaveBeenCalledWith('workout_sets');
    expect(eq).toHaveBeenCalledWith('session_id', 's1');
    expect(result).toEqual([{ id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 100, reps: 5, rpe: null }]);
  });

  it('returns an empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getLoggedSets('s1');

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/workout/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement**

Create `src/features/workout/api.ts`:

```ts
import { supabase } from '../../lib/supabase';
import type { SessionExercise, LoggedSet } from './types';

interface SessionRow {
  routine_id: string | null;
  started_at: string;
}

interface RoutineExerciseRow {
  exercise_id: string;
  order: number;
  rest_seconds: number;
  superset_group: number | null;
  exercises: { name: string } | null;
}

interface LoggedExerciseRow {
  exercise_id: string;
  exercises: { name: string } | null;
}

interface LoggedSetRow {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export async function startSession(routineId: string | null): Promise<{ id: string | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { id: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: session.user.id, routine_id: routineId })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error ? error.message : 'Failed to start session' };
  return { id: (data as { id: string }).id, error: null };
}

export async function getSessionExercises(
  sessionId: string
): Promise<{ exercises: SessionExercise[]; startedAt: string }> {
  const { data: sessionRow } = await supabase
    .from('workout_sessions')
    .select('routine_id, started_at')
    .eq('id', sessionId)
    .maybeSingle();

  const row = sessionRow as SessionRow | null;
  const routineId = row?.routine_id ?? null;
  const startedAt = row?.started_at ?? new Date().toISOString();

  const exercises: SessionExercise[] = [];

  if (routineId) {
    const { data } = await supabase
      .from('routine_exercises')
      .select('exercise_id, order, rest_seconds, superset_group, exercises(name)')
      .eq('routine_id', routineId)
      .order('order', { ascending: true });

    const rows = (data ?? []) as unknown as RoutineExerciseRow[];
    for (const r of rows) {
      exercises.push({
        exerciseId: r.exercise_id,
        exerciseName: r.exercises?.name ?? '',
        order: r.order,
        restSeconds: r.rest_seconds,
        supersetGroup: r.superset_group,
      });
    }
  }

  const { data: loggedData } = await supabase.from('workout_sets').select('exercise_id, exercises(name)').eq('session_id', sessionId);

  const loggedRows = (loggedData ?? []) as unknown as LoggedExerciseRow[];
  const knownIds = new Set(exercises.map((e) => e.exerciseId));

  for (const r of loggedRows) {
    if (knownIds.has(r.exercise_id)) continue;
    knownIds.add(r.exercise_id);
    exercises.push({
      exerciseId: r.exercise_id,
      exerciseName: r.exercises?.name ?? '',
      order: exercises.length,
      restSeconds: 90,
      supersetGroup: null,
    });
  }

  return { exercises, startedAt };
}

export async function getLoggedSets(sessionId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('id, exercise_id, set_number, weight, reps, rpe')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as LoggedSetRow[]).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    weight: row.weight,
    reps: row.reps,
    rpe: row.rpe,
  }));
}
```

Leave `logSet`, `updateWorkoutSet`, `finishSession` for Task 4 to add — do not stub them here.

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/workout/api.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add workout API (start session, session exercises, logged sets)"
```

---

### Task 4: Workout API — log set, update set, finish session

**Files:**
- Modify: `src/features/workout/api.ts` (add `logSet`, `updateWorkoutSet`, `finishSession`)
- Modify: `src/features/workout/api.test.ts` (add tests)

**Interfaces:**
- Consumes: `supabase`.
- Produces: `logSet(sessionId, exerciseId, setNumber, weight, reps, rpe): Promise<{ error: string | null }>`, `updateWorkoutSet(setId, weight, reps, rpe): Promise<{ error: string | null }>`, `finishSession(sessionId, startedAt): Promise<{ error: string | null }>` — used by Task 7's screen.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/workout/api.test.ts` (update the import line to add the three new functions):

```ts
describe('logSet', () => {
  it('inserts a workout_sets row', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const result = await logSet('s1', 'ex1', 2, 100, 5, 8);

    expect(supabase.from).toHaveBeenCalledWith('workout_sets');
    expect(insert).toHaveBeenCalledWith({
      session_id: 's1',
      exercise_id: 'ex1',
      set_number: 2,
      weight: 100,
      reps: 5,
      rpe: 8,
    });
    expect(result).toEqual({ error: null });
  });
});

describe('updateWorkoutSet', () => {
  it('updates weight/reps/rpe for a set by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const result = await updateWorkoutSet('set1', 105, 5, 9);

    expect(update).toHaveBeenCalledWith({ weight: 105, reps: 5, rpe: 9 });
    expect(eq).toHaveBeenCalledWith('id', 'set1');
    expect(result).toEqual({ error: null });
  });
});

describe('finishSession', () => {
  it('sets ended_at and a computed duration_seconds', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-04T00:10:00Z').getTime());

    const result = await finishSession('s1', '2026-09-04T00:00:00Z');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ duration_seconds: 600, ended_at: expect.any(String) })
    );
    expect(eq).toHaveBeenCalledWith('id', 's1');
    expect(result).toEqual({ error: null });

    nowSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/workout/api.test.ts`
Expected: FAIL — `logSet`/`updateWorkoutSet`/`finishSession` are not exported functions.

- [ ] **Step 3: Implement**

Add to `src/features/workout/api.ts`:

```ts
export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weight: number | null,
  reps: number | null,
  rpe: number | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('workout_sets').insert({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setNumber,
    weight,
    reps,
    rpe,
  });
  return { error: error ? error.message : null };
}

export async function updateWorkoutSet(
  setId: string,
  weight: number | null,
  reps: number | null,
  rpe: number | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('workout_sets').update({ weight, reps, rpe }).eq('id', setId);
  return { error: error ? error.message : null };
}

export async function finishSession(sessionId: string, startedAt: string): Promise<{ error: string | null }> {
  const endedAt = new Date();
  const durationSeconds = Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 1000);

  const { error } = await supabase
    .from('workout_sessions')
    .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds })
    .eq('id', sessionId);

  return { error: error ? error.message : null };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/workout/api.test.ts`
Expected: PASS (9/9)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add log/update set and finish session API"
```

---

### Task 5: Rest timer banner component

**Files:**
- Create: `src/features/workout/components/RestTimerBanner.tsx`
- Create: `src/features/workout/components/__tests__/RestTimerBanner.test.tsx`
- Delete: `src/features/workout/components/__tests__/HapticsSmoke.test.tsx` (Task 1's temporary smoke test — superseded by this task's real component test)

**Interfaces:**
- Consumes: `expo-haptics` (Task 1).
- Produces: `RestTimerBanner({ seconds, onDismiss })` — used by Task 7's Active Workout screen.

**Known risk — please verify, don't assume:** this is the first test in this project to combine Jest fake timers with React Testing Library's async `act()`-wrapped `render`. Do not assume the brief's exact test code works as written — run it, and if you see timing issues, warnings, or a stuck test, diagnose against the actual behavior (check whether `act()` needs to wrap the timer advancement, whether `jest.useFakeTimers()` needs a specific config for this RN/jest-expo setup) rather than guessing.

- [ ] **Step 1: Create the component**

Create `src/features/workout/components/RestTimerBanner.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface RestTimerBannerProps {
  seconds: number;
  onDismiss: () => void;
}

export function RestTimerBanner({ seconds, onDismiss }: RestTimerBannerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <View style={styles.banner}>
      <Text style={typography.body}>{remaining > 0 ? `Resting: ${remaining}s` : 'Rest complete'}</Text>
      <Button title="Dismiss" variant="secondary" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `src/features/workout/components/__tests__/RestTimerBanner.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

import * as Haptics from 'expo-haptics';
import { RestTimerBanner } from '../RestTimerBanner';

describe('RestTimerBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts down and triggers haptics at zero', async () => {
    await render(<RestTimerBanner seconds={2} onDismiss={jest.fn()} />);

    expect(screen.getByText('Resting: 2s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Resting: 1s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Rest complete')).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('calls onDismiss when dismissed', async () => {
    const onDismiss = jest.fn();
    await render(<RestTimerBanner seconds={30} onDismiss={onDismiss} />);

    await fireEvent.press(screen.getByText('Dismiss'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
```

If this fails to run cleanly as written (per the known-risk note above), adapt the timer-advancement mechanics until it passes with pristine output — do not weaken the assertions themselves (both tests must still verify the same two behaviors: countdown-then-haptics, and dismiss).

- [ ] **Step 3: Run the test, confirm it fails first (before the component exists), then passes**

Since the component already exists from Step 1, temporarily verify RED by checking out a version without it if you want strict RED/GREEN, or simply confirm GREEN directly (this component is simple enough that skipping strict RED here is acceptable) — but do run it and confirm PASS either way, and document what you found regarding the fake-timers risk in your report.

Run: `npx jest src/features/workout/components/__tests__/RestTimerBanner.test.tsx`
Expected: PASS (2/2), pristine.

- [ ] **Step 4: Delete Task 1's temporary smoke test**

```bash
rm src/features/workout/components/__tests__/HapticsSmoke.test.tsx
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add rest timer banner with haptic feedback"
```

---

### Task 6: Session exercise card component

**Files:**
- Create: `src/features/workout/components/SessionExerciseCard.tsx`
- Create: `src/features/workout/components/__tests__/SessionExerciseCard.test.tsx`

**Interfaces:**
- Consumes: `SessionExercise`/`LoggedSet` types (Task 2), `Button` (Phase 2a).
- Produces: `SessionExerciseCard({ exercise, sets, onLogSet, onUpdateSet })` — used by Task 7's Active Workout screen.

- [ ] **Step 1: Create the component**

Create `src/features/workout/components/SessionExerciseCard.tsx`:

```tsx
import { useState } from 'react';
import { Text, TextInput, View, StyleSheet, Pressable } from 'react-native';
import type { SessionExercise, LoggedSet } from '../types';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface SessionExerciseCardProps {
  exercise: SessionExercise;
  sets: LoggedSet[];
  onLogSet: (weight: number | null, reps: number | null, rpe: number | null) => void;
  onUpdateSet: (setId: string, weight: number | null, reps: number | null, rpe: number | null) => void;
}

function parseNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function SessionExerciseCard({ exercise, sets, onLogSet, onUpdateSet }: SessionExerciseCardProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  function handleConfirm() {
    const w = parseNum(weight);
    const r = parseNum(reps);
    const p = parseNum(rpe);
    if (editingSetId) {
      onUpdateSet(editingSetId, w, r, p);
      setEditingSetId(null);
    } else {
      onLogSet(w, r, p);
    }
    setWeight('');
    setReps('');
    setRpe('');
  }

  function startEditing(set: LoggedSet) {
    setEditingSetId(set.id);
    setWeight(set.weight != null ? String(set.weight) : '');
    setReps(set.reps != null ? String(set.reps) : '');
    setRpe(set.rpe != null ? String(set.rpe) : '');
  }

  return (
    <View style={styles.card}>
      <Text style={typography.body}>{exercise.exerciseName}</Text>
      {exercise.supersetGroup != null && <Text style={typography.label}>Superset {exercise.supersetGroup}</Text>}
      {sets.map((set) => (
        <Pressable key={set.id} onPress={() => startEditing(set)} style={styles.setRow}>
          <Text style={typography.label}>
            Set {set.setNumber}: {set.weight ?? '-'} kg x {set.reps ?? '-'}
            {set.rpe != null ? ` @ RPE ${set.rpe}` : ''}
          </Text>
        </Pressable>
      ))}
      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="kg" value={weight} onChangeText={setWeight} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="reps" value={reps} onChangeText={setReps} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="RPE" value={rpe} onChangeText={setRpe} keyboardType="numeric" />
      </View>
      <Button title={editingSetId ? 'Update Set' : 'Add Set'} variant="secondary" onPress={handleConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  setRow: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    color: colors.textPrimary,
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `src/features/workout/components/__tests__/SessionExerciseCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionExerciseCard } from '../SessionExerciseCard';
import type { SessionExercise } from '../../types';

const exercise: SessionExercise = {
  exerciseId: 'ex1',
  exerciseName: 'Bench Press',
  order: 0,
  restSeconds: 90,
  supersetGroup: null,
};

describe('SessionExerciseCard', () => {
  it('logs a new set with parsed numeric values', async () => {
    const onLogSet = jest.fn();
    await render(<SessionExerciseCard exercise={exercise} sets={[]} onLogSet={onLogSet} onUpdateSet={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('kg'), '100');
    fireEvent.changeText(screen.getByPlaceholderText('reps'), '5');
    await fireEvent.press(screen.getByText('Add Set'));

    expect(onLogSet).toHaveBeenCalledWith(100, 5, null);
  });

  it('edits an existing set when tapped', async () => {
    const onUpdateSet = jest.fn();
    const sets = [{ id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 80, reps: 8, rpe: null }];
    await render(<SessionExerciseCard exercise={exercise} sets={sets} onLogSet={jest.fn()} onUpdateSet={onUpdateSet} />);

    await fireEvent.press(screen.getByText(/Set 1:/));
    fireEvent.changeText(screen.getByPlaceholderText('kg'), '85');
    await fireEvent.press(screen.getByText('Update Set'));

    expect(onUpdateSet).toHaveBeenCalledWith('set1', 85, 8, null);
  });
});
```

- [ ] **Step 3: Run the test, confirm it passes**

This component has no async effects, so per this project's established finding (Phase 2a's Button test), un-awaited `fireEvent.changeText`/synchronous presses should be safe — but verify empirically per the global constraint, don't just assume.

Run: `npx jest src/features/workout/components/__tests__/SessionExerciseCard.test.tsx`
Expected: PASS (2/2)

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add session exercise card component"
```

---

### Task 7: Active Workout screen

**Files:**
- Modify: `app/(member)/_layout.tsx` (add `routines` — wait, add `active-workout` Tabs.Screen with `href: null`)
- Create: `app/(member)/active-workout/_layout.tsx`
- Create: `app/(member)/active-workout/[sessionId].tsx`
- Create: `app/(member)/active-workout/__tests__/[sessionId].test.tsx`

**Interfaces:**
- Consumes: `getSessionExercises`/`getLoggedSets`/`logSet`/`updateWorkoutSet`/`finishSession` (Tasks 3-4), `shouldStartRestTimer` (Task 2), `RestTimerBanner` (Task 5), `SessionExerciseCard` (Task 6), `getExercise` (Phase 2a).
- Produces: the screen Tasks 8-9's "Start" buttons navigate to.

- [ ] **Step 1: Hide the new route from the tab bar**

Modify `app/(member)/_layout.tsx` — add a fourth `Tabs.Screen` entry (leave the existing three untouched):

```tsx
<Tabs.Screen name="active-workout" options={{ href: null }} />
```

- [ ] **Step 2: Create the Stack layout**

Create `app/(member)/active-workout/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function ActiveWorkoutLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Write the failing test**

Create `app/(member)/active-workout/__tests__/[sessionId].test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/workout/api', () => ({
  getSessionExercises: jest.fn(),
  getLoggedSets: jest.fn(),
  logSet: jest.fn(),
  updateWorkoutSet: jest.fn(),
  finishSession: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ sessionId: 's1' })),
}));

import { getSessionExercises, getLoggedSets, logSet, finishSession } from '../../../../src/features/workout/api';
import { router } from 'expo-router';
import ActiveWorkout from '../[sessionId]';

describe('ActiveWorkout', () => {
  it('loads session exercises and logs a set', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (logSet as jest.Mock).mockResolvedValue({ error: null });

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText('kg'), '100');
    fireEvent.changeText(screen.getByPlaceholderText('reps'), '5');
    await fireEvent.press(screen.getByText('Add Set'));

    expect(logSet).toHaveBeenCalledWith('s1', 'ex1', 1, 100, 5, null);
  });

  it('finishes the session and navigates back', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (finishSession as jest.Mock).mockResolvedValue({ error: null });

    await render(<ActiveWorkout />);
    await waitFor(() => expect(screen.getByText('Finish')).toBeTruthy());

    await fireEvent.press(screen.getByText('Finish'));

    expect(finishSession).toHaveBeenCalledWith('s1', '2026-09-04T00:00:00Z');
    expect(router.replace).toHaveBeenCalledWith('/(member)/workout');
  });
});
```

- [ ] **Step 4: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/active-workout/__tests__/\[sessionId\].test.tsx"`
Expected: FAIL — `Cannot find module '../[sessionId]'`

- [ ] **Step 5: Implement the screen**

Create `app/(member)/active-workout/[sessionId].tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import {
  getSessionExercises,
  getLoggedSets,
  logSet,
  updateWorkoutSet,
  finishSession,
} from '../../../src/features/workout/api';
import { getExercise } from '../../../src/features/exercises/api';
import { shouldStartRestTimer } from '../../../src/features/workout/restTimer';
import { SessionExerciseCard } from '../../../src/features/workout/components/SessionExerciseCard';
import { RestTimerBanner } from '../../../src/features/workout/components/RestTimerBanner';
import type { SessionExercise, LoggedSet } from '../../../src/features/workout/types';
import { typography, spacing } from '../../../src/theme';

export default function ActiveWorkout() {
  const { sessionId, addExerciseId } = useLocalSearchParams<{ sessionId: string; addExerciseId?: string }>();
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([getSessionExercises(sessionId), getLoggedSets(sessionId)]).then(([sessionData, loggedSets]) => {
      setExercises(sessionData.exercises);
      setStartedAt(sessionData.startedAt);
      setSets(loggedSets);
      setLoaded(true);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!addExerciseId || !loaded) return;
    getExercise(addExerciseId).then((exercise) => {
      if (!exercise) return;
      setExercises((prev) => [
        ...prev,
        { exerciseId: exercise.id, exerciseName: exercise.name, order: prev.length, restSeconds: 90, supersetGroup: null },
      ]);
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId, loaded]);

  async function handleLogSet(exerciseId: string, weight: number | null, reps: number | null, rpe: number | null) {
    const existingCount = sets.filter((s) => s.exerciseId === exerciseId).length;
    const { error: logError } = await logSet(sessionId, exerciseId, existingCount + 1, weight, reps, rpe);
    if (logError) {
      setError(logError);
      return;
    }
    const updated = await getLoggedSets(sessionId);
    setSets(updated);

    const index = exercises.findIndex((e) => e.exerciseId === exerciseId);
    if (index !== -1 && shouldStartRestTimer(exercises, index)) {
      setRestSeconds(exercises[index].restSeconds);
    }
  }

  async function handleUpdateSet(setId: string, weight: number | null, reps: number | null, rpe: number | null) {
    const { error: updateError } = await updateWorkoutSet(setId, weight, reps, rpe);
    if (updateError) {
      setError(updateError);
      return;
    }
    const updated = await getLoggedSets(sessionId);
    setSets(updated);
  }

  async function handleFinish() {
    if (!startedAt) return;
    const { error: finishError } = await finishSession(sessionId, startedAt);
    if (finishError) {
      setError(finishError);
      return;
    }
    router.replace('/(member)/workout');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Workout</Text>
        <Button title="Finish" onPress={handleFinish} />
      </View>
      {error && <ErrorText>{error}</ErrorText>}
      {restSeconds !== null && <RestTimerBanner seconds={restSeconds} onDismiss={() => setRestSeconds(null)} />}
      <ScrollView>
        {exercises.map((exercise) => (
          <SessionExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            sets={sets.filter((s) => s.exerciseId === exercise.exerciseId)}
            onLogSet={(weight, reps, rpe) => handleLogSet(exercise.exerciseId, weight, reps, rpe)}
            onUpdateSet={handleUpdateSet}
          />
        ))}
      </ScrollView>
      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/(member)/profile/exercises',
            params: { pickMode: 'true', returnTo: `/(member)/active-workout/${sessionId}` },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
});
```

- [ ] **Step 6: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/active-workout/__tests__/\[sessionId\].test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: all suites pass, pristine.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Active Workout screen"
```

---

### Task 8: Enable "Start Empty Workout"

**Files:**
- Modify: `app/(member)/workout.tsx`
- Modify: `app/(member)/__tests__/workout.test.tsx`

**Interfaces:**
- Consumes: `startSession` (Task 3).
- Produces: a working "Start Empty Workout" button navigating into Task 7's screen.

- [ ] **Step 1: Write the failing test**

Add to `app/(member)/__tests__/workout.test.tsx`: add `fireEvent` to the existing `@testing-library/react-native` import; add a NEW, separate `jest.mock('../../../src/features/workout/api', () => ({ startSession: jest.fn() }));` block (do not add `startSession` into the existing `jest.mock('../../../src/features/routines/api', ...)` block — `startSession` lives in a different module, `src/features/workout/api`); and add `router.push` to the existing `expo-router` mock if not already present):

```tsx
import { startSession } from '../../../src/features/workout/api';
```

```tsx
it('starts an empty session and navigates to it when "Start Empty Workout" is pressed', async () => {
  (listRoutines as jest.Mock).mockResolvedValue([]);
  (startSession as jest.Mock).mockResolvedValue({ id: 's1', error: null });

  await render(<Workout />);
  await waitFor(() => expect(screen.getByText('Start Empty Workout')).toBeTruthy());

  await fireEvent.press(screen.getByText('Start Empty Workout'));

  expect(startSession).toHaveBeenCalledWith(null);
  expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/s1');
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/__tests__/workout.test.tsx"`
Expected: FAIL — the button is currently `disabled` with a no-op `onPress`.

- [ ] **Step 3: Implement**

Modify `app/(member)/workout.tsx`:

Add the import:

```tsx
import { startSession } from '../../src/features/workout/api';
```

Add the handler function (inside the component, before the `return`):

```tsx
async function handleStartEmpty() {
  const { id } = await startSession(null);
  if (id) router.push(`/(member)/active-workout/${id}`);
}
```

Replace the "Start Empty Workout" button:

```tsx
<Button title="Start Empty Workout" onPress={handleStartEmpty} />
```

(remove the `disabled` prop — this button is now functional)

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/__tests__/workout.test.tsx"`
Expected: PASS (2/2)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: enable Start Empty Workout"
```

---

### Task 9: Enable "Start Routine"

**Files:**
- Modify: `app/(member)/routines/[id].tsx`
- Modify: `app/(member)/routines/__tests__/[id].test.tsx`

**Interfaces:**
- Consumes: `startSession` (Task 3).
- Produces: a working "Start Routine" button navigating into Task 7's screen, completing this plan.

- [ ] **Step 1: Write the failing test**

Add to `app/(member)/routines/__tests__/[id].test.tsx` (add a `jest.mock('../../../../src/features/workout/api', () => ({ startSession: jest.fn() }));` block, add `router.push` to the existing `expo-router` mock if not already present, and add the import `import { startSession } from '../../../../src/features/workout/api';`):

```tsx
it('starts a session for this routine and navigates to it when "Start Routine" is pressed', async () => {
  (getRoutine as jest.Mock).mockResolvedValue({
    id: 'r1',
    name: 'Push Day',
    exercises: [],
  });
  (startSession as jest.Mock).mockResolvedValue({ id: 's1', error: null });

  await render(<RoutineDetail />);
  await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

  await fireEvent.press(screen.getByText('Start Routine'));

  expect(startSession).toHaveBeenCalledWith('r1');
  expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/s1');
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest "app/\(member\)/routines/__tests__/\[id\].test.tsx"`
Expected: FAIL — the button is currently `disabled` with a no-op `onPress`.

- [ ] **Step 3: Implement**

Modify `app/(member)/routines/[id].tsx`:

Add the import:

```tsx
import { startSession } from '../../../src/features/workout/api';
```

Add the handler function (inside the component, after the `if (!routine)` early-return, so `routine.id` is always defined here):

```tsx
async function handleStartRoutine() {
  const { id: sessionId } = await startSession(routine.id);
  if (sessionId) router.push(`/(member)/active-workout/${sessionId}`);
}
```

Replace the "Start Routine" button:

```tsx
<Button title="Start Routine" onPress={handleStartRoutine} />
```

(remove the `disabled` prop)

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest "app/\(member\)/routines/__tests__/\[id\].test.tsx"`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites pass, pristine.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: enable Start Routine"
```

---

## Manual verification (after all tasks)

1. `npx supabase db push` — no-op expected (no new migrations this phase), just confirms nothing drifted.
2. From the Workout tab, confirm no stray "active-workout" tab appears in the bottom nav.
3. Tap "Start Empty Workout" — confirm it lands on a blank Active Workout screen. Add an exercise via "Add Exercise", log a set (weight/reps/RPE), confirm the rest timer banner appears and counts down, confirm the phone vibrates when it hits zero.
4. Add a second exercise, group it into a superset with the first (this requires going back to a routine — for an empty workout, supersets aren't configurable; skip superset verification here and instead:)
5. From a routine with two exercises grouped into a superset (built in Phase 2b-1's manual verification), tap "Start Routine" — confirm both exercises appear pre-populated, confirm logging a set for the first one does NOT start a rest timer (since the next exercise shares its superset group), and confirm logging a set for the second one DOES start the timer.
6. Tap a previously-logged set, change its weight, confirm it updates rather than adding a duplicate.
7. Tap "Finish" — confirm it navigates back to the Workout tab. Then open that routine's detail screen (Phase 2b-1) and confirm the volume chart now shows real data instead of "No data yet." Open the exercise's detail screen (Phase 2a) and confirm History/Personal Records now show real data too.
