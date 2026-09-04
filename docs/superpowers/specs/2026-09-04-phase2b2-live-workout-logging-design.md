# Phase 2b-2: Live Workout Logging — Design Spec

**Status**: Approved for planning
**Date**: 2026-09-04
**Type**: Architectural (new subsystem, builds on Phase 1 + Phase 2a + Phase 2b-1)
**Parent spec**: `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`

## 1. Purpose & context

Phase 2b-1 made routines real but left "Start Routine"/"Start Empty Workout"
disabled, since there was no logging flow yet. This phase builds that flow:
a single Active Workout screen that logs real sets to `workout_sessions`/
`workout_sets` (Phase 1 schema, unchanged) — the exact tables Phase 2a's
History/Personal-Records/Leaderboard and Phase 2b-1's volume chart already
query but have never had real data to show.

**Explicitly deferred**: offline resilience (a later, dedicated phase per
the parent spec's original architecture notes — local caching, background
sync queue). This phase assumes normal connectivity during a session.

## 2. Data model

**No new tables or columns.** `workout_sessions(id, user_id, routine_id
nullable, started_at, ended_at nullable, duration_seconds nullable)` and
`workout_sets(id, session_id, exercise_id, set_number, weight, reps, rpe,
completed_at)` (Phase 1) already support everything this phase needs.

**Session exercise list** (which exercises appear in the Active Workout
screen, including ones with zero sets logged yet) is not persisted as its
own table — it's derived client-side as the union of:
1. The routine's `routine_exercises` (order + `superset_group` preserved), if `routine_id` is set.
2. Any exercise ad-hoc-added during the session (client state only).
3. Any exercise that already has at least one logged `workout_sets` row for this session (recovers on a fresh screen mount even without client state, e.g. after a background/foreground cycle that didn't kill the JS context).

Trade-off, accepted: if the app process is killed mid-session, an
ad-hoc-added exercise with zero sets logged is lost (must be re-added) —
but every logged set is safe immediately, since sets are written to the
database as they're logged, not batched.

## 3. Screens & navigation

```
app/(member)/workout/
  active.tsx          # the live logging screen (both entry points route here)
```

**Entry points:**
- Workout tab's "Start Empty Workout" (currently disabled) → creates a
  `workout_sessions` row with `routine_id: null`, navigates to
  `workout/active?sessionId=<id>`.
- Routine detail screen's "Start Routine" (currently disabled) → creates a
  `workout_sessions` row with `routine_id: <routine.id>`, navigates to
  `workout/active?sessionId=<id>&routineId=<routine.id>`.

**Active Workout screen:**
- Header: elapsed time (derived from `started_at`), "Finish" button.
- For each session exercise (ordered, superset groups visually adjacent):
  name, logged sets so far (each tappable to edit), an "Add Set" control
  (weight/reps/RPE inputs + confirm), superset label if grouped.
- "Add Exercise" button (reuses the Phase 2b-1 picker-mode handoff pattern).
- Rest timer banner: appears after logging a set that should trigger rest
  (see §4), shows a live countdown, dismissible early, vibrates via
  `expo-haptics` on reaching zero.
- "Finish": sets `ended_at = now()`, `duration_seconds` computed from
  `started_at`, navigates back to `/(member)/workout`.

## 4. Rest timer logic (pure, testable)

Given the ordered session-exercise list and the index of the exercise a set
was just logged for:

```
shouldStartRestTimer(exercises, currentIndex): boolean
  next = exercises[currentIndex + 1]
  if next exists AND next.supersetGroup != null AND next.supersetGroup === exercises[currentIndex].supersetGroup:
    return false   // still inside the same superset group — no rest yet
  return true       // standalone exercise, end of a group, or end of the list
```

When true, start a countdown using `exercises[currentIndex].restSeconds`
(the just-finished exercise's own rest value — for a superset group, this
is the LAST exercise in the group, i.e. the rest happens after the whole
group, matching real superset training). Ad-hoc-added exercises (no
`routine_exercises` row) default to `restSeconds: 90`.

## 5. API additions (`src/features/workout/api.ts`, new module)

- `startSession(routineId: string | null): Promise<{ id: string | null; error: string | null }>` — inserts a `workout_sessions` row for the current user.
- `getSessionExercises(sessionId, routineId): Promise<SessionExercise[]>` — implements the union derivation from §2.
- `logSet(sessionId, exerciseId, setNumber, weight, reps, rpe): Promise<{ error: string | null }>` — inserts a `workout_sets` row.
- `updateWorkoutSet(setId, weight, reps, rpe): Promise<{ error: string | null }>` — edits an existing logged set.
- `finishSession(sessionId, startedAt): Promise<{ error: string | null }>` — sets `ended_at`/`duration_seconds`.

RLS: all of the above operate on the caller's own rows via the existing
`workout_sessions_owner`/`workout_sets_owner` policies (Phase 1) — no new
policies needed, no `security definer` function needed (unlike Phase 2a's
leaderboard, nothing here reads across users).

## 6. Out of scope (deferred)

- Offline resilience / local caching / sync queue (its own later phase).
- Push notifications or audio for the rest timer (haptics + visual only).
- Editing which exercises belong to a superset group mid-session (session
  exercises inherit their grouping from the routine at start time; changing
  supersets happens in the routine editor, Phase 2b-1).
