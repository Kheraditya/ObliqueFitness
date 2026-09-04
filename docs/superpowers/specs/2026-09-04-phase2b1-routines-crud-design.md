# Phase 2b-1: Routines CRUD — Design Spec

**Status**: Approved for planning
**Date**: 2026-09-04
**Type**: Architectural (new subsystem, builds on Phase 1 + Phase 2a)
**Parent spec**: `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`

## 1. Purpose & context

Phase 2a built the exercise library and a Workout tab placeholder. This phase
makes routines real: members can create, edit, and delete routines built from
the exercise library, with target sets/rest per exercise and superset
grouping. It does **not** include live workout logging (Phase 2b-2) or
routine-level charts backed by real data (Phase 2b-3) — those are separate,
dependent sub-phases. "Start Routine"/"Start Empty Workout" stay disabled
placeholders here, same as they've been since Phase 2a, since starting a
workout requires the logging flow that doesn't exist yet.

## 2. Data model changes

Phase 1's `routine_exercises` table already has `id, routine_id, exercise_id,
order, target_sets, rest_seconds`. One addition, migration
`0007_routine_supersets.sql`:

```sql
alter table routine_exercises
  add column superset_group integer;
```

`null` means the exercise is a standalone straight set. A non-null value
groups it with every other `routine_exercise` in the same `routine_id`
sharing that value; members within a group are ordered by the existing
`order` column. No uniqueness constraint needed — group numbers are scoped
per-routine and assigned by the client when building the routine (e.g.
sequential integers starting at 1 each time a new superset is created).

RLS: `routine_exercises` already inherits access from its parent `routines`
row via the existing `routine_exercises_via_routine` policy
(`supabase/migrations/0002_rls_policies.sql`) — no new policy needed, this
column change doesn't alter who can read/write which rows.

## 3. Screens & navigation

```
app/(member)/workout.tsx                      # REPLACED: real routines list, not a placeholder
app/(member)/routines/
  _layout.tsx                                  # Stack
  new.tsx                                      # create routine
  [id].tsx                                     # routine detail (view)
  [id]/edit.tsx                                # edit routine
```

**Workout tab** (`workout.tsx`): "Start Empty Workout" (disabled, unchanged),
"New Routine" button → `routines/new`, "My Routines" list (fetched via a new
`listRoutines()` API call) — each row navigates to `routines/[id]`. "Explore"
stays a disabled placeholder (community/public routines is a separate,
later social feature, not part of CRUD).

**New Routine** (`routines/new.tsx`): name text field, an "Add Exercise"
button that opens the existing exercise list screen in picker mode (reuses
Phase 2a's `listExercises`/search, with a mode flag that makes rows
selectable instead of navigating to the exercise detail screen), then for
each added exercise: target sets (numeric stepper), rest seconds (numeric
stepper), up/down reorder buttons, and a "Group into superset" toggle that
merges an exercise with the one above it into the same `superset_group`.
Save writes one `routines` row and N `routine_exercises` rows.

**Routine detail** (`routines/[id].tsx`): routine name, exercise list with
superset groups visually bracketed (a left border/label spanning grouped
rows), a disabled "Start Routine" button, an "Edit Routine" link, and a
Volume/Reps/Duration toggle above a chart area. The chart pulls real data
via a `getRoutineVolumeHistory(routineId)` query against `workout_sessions`/
`workout_sets` for sessions that used this routine — since no session can
reference this routine yet (live logging is Phase 2b-2), the query
correctly returns an empty series and the chart renders an empty-state
("No data yet"), not a fake/mocked graph. This mirrors Phase 2a's approach
to History/Leaderboard: real queries, currently-empty results.

**Edit Routine** (`routines/[id]/edit.tsx`): same exercise-editing UI as New
Routine, pre-populated from the existing routine, plus a "Delete Routine"
button.

## 4. Charting

Per the parent spec's original tech-stack decision, use `victory-native` for
the Volume/Reps/Duration chart (not yet installed in this project — this
phase adds it as a new dependency). A simple line or bar chart is sufficient
for an empty/near-empty dataset at this stage; the chart component itself
should be written generically enough that Phase 2b-3 (once real data flows
in from 2b-2) doesn't need to rebuild it, only feed it real data.

## 5. Out of scope (deferred)

- Live workout session logging, rest timer countdown, RPE capture (Phase 2b-2)
- "Explore" / community routines (separate social feature)
- Enabling "Start Routine"/"Start Empty Workout" (blocked on 2b-2)
- Drag-and-drop reordering (up/down buttons are sufficient for now)
