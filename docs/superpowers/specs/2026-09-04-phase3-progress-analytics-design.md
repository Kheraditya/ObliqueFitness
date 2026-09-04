# Phase 3: Progress & Analytics — Design Spec

**Status**: Approved for planning
**Date**: 2026-09-04
**Type**: Architectural (new subsystem, builds on Phase 1 + Phase 2a/2b-1/2b-2)
**Parent spec**: `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`

## 1. Purpose & context

Phases 1-2 built the full workout-logging loop and now write real data into
`workout_sessions`/`workout_sets`. Phase 3 is the app's stated core
differentiator: consolidated progress visualization. It fills in three
screens that exist today only as placeholders or disabled buttons:

- `app/(member)/home.tsx` — currently static "coming soon" text.
- `app/(member)/profile/index.tsx` — "Statistics" and "Measures" buttons
  exist and are `disabled`.

Built in one pass (not split), per explicit direction: home dashboard card,
a Statistics screen (muscle heatmap + per-exercise strength trends), and a
Measures screen (body measurement tracking).

**Out of scope for this phase** (per the parent spec's phased roadmap):
calendar/streak-day visualization beyond the home card's single streak
number, monthly recap report — both are Phase 6 ("Polish"). Admin-facing
analytics are Phase 4.

## 2. Data model

**One new table**, `body_measurements` (the only entity in the parent
spec's data model with no existing home):

```sql
create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,        -- 'weight' | 'body_fat' | a custom free-text label
  value numeric not null,
  unit text not null,        -- 'kg' | '%' | free text for a custom type
  logged_at timestamptz not null default now()
);
```

RLS: owner-only, same pattern as `workout_sets` — `for all using (user_id =
auth.uid())`, relying on Postgres filling `WITH CHECK` from `USING` (the
established, audited pattern from Phase 1/2b-1/2b-2; no new policy shape
introduced).

**Everything else derives from existing tables** — no other new tables or
columns. `exercises.primary_muscles`/`secondary_muscles` (seeded from
free-exercise-db in Phase 2a) already carries the muscle-group taxonomy the
heatmap needs: exactly 17 values across the seeded 876 exercises —
`abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes,
hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders,
traps, triceps`.

## 3. Computations

All derived client-side from raw rows (the established pattern —
`getRoutineVolumeHistory`, `getPersonalRecords` already do this rather than
push aggregation into SQL), each backed by a pure, unit-testable function
where the logic is non-trivial:

- **Streak**: consecutive calendar days, most recent backward from today,
  with at least one `workout_sessions` row whose `ended_at is not null`.
  Pure function `computeStreak(sessionDateStrings: string[]): number` takes
  already-deduplicated, descending calendar-day strings (`YYYY-MM-DD`,
  device-local) and counts the consecutive run from today. Query bounds the
  lookup to the last 90 days (a streak longer than that is not a realistic
  case to optimize for, and it keeps the query cheap).
- **Week-over-week volume**: one query for the last 14 days of sessions +
  sets, bucketed client-side into "this week" (last 7 days) vs "prior week"
  (8-14 days ago) by comparing `started_at` against day boundaries. Pure
  function `computeVolumeChangePct(thisWeek: number, lastWeek: number):
  number | null` — returns `null` when `lastWeek` is 0 (avoids a
  divide-by-zero / infinite percentage; the UI renders `null` as "–", not
  "0%" or "∞%").
- **Muscle-balance volume**: sum of `weight * reps` per muscle group over
  the last 7 days, attributing 100% of a set's volume to each of its
  exercise's `primary_muscles` only (secondary muscles are excluded from
  this aggregate — a deliberate simplification so total volume shown across
  all muscles doesn't double-count relative to real training load; secondary
  muscles remain visible elsewhere via the exercise detail screen, unchanged
  from Phase 2a). One function, one 7-day window, reused by both the home
  card (compact bars) and the Statistics screen (full heatmap) — no separate
  aggregation path for the two views.
- **Per-exercise strength trend**: one row per session for a given exercise
  — `{ date, maxWeight, best1RM }`, `best1RM` via the existing Epley formula
  already used in `getPersonalRecords` (`weight * (1 + reps / 30)`),
  ordered ascending by date for left-to-right charting.

## 4. Muscle heatmap

A stylized (not anatomically precise) humanoid figure built from
`react-native-svg` primitives (already an installed dependency via
victory-native) — rounded rects and circles for head/torso/limbs — with a
front/back toggle. Each of 16 zones is filled by linearly interpolating
between `colors.surfaceElevated` (zero volume this week) and `colors.accent`
(the zone with the most volume this week) based on that zone's share of the
max zone's volume. All 17 seeded muscle strings map onto exactly one of the
16 zones (`lats` and `middle back` share one "upper back" zone; every other
muscle gets its own):

| Muscle string | View | Zone |
|---|---|---|
| neck | front | neck |
| shoulders | front | shoulders |
| chest | front | chest |
| biceps | front | biceps |
| forearms | front | forearms |
| abdominals | front | abs |
| quadriceps | front | quads |
| adductors | front | adductors |
| traps | back | traps |
| lats | back | upperBack |
| middle back | back | upperBack |
| lower back | back | lowerBack |
| triceps | back | triceps |
| glutes | back | glutes |
| hamstrings | back | hamstrings |
| abductors | back | abductors |
| calves | back | calves |

This is a scope decision, not a spec gap: a pixel-accurate anatomical
illustration is out of scope for v1 — the goal is a clearly body-shaped,
correctly-proportioned-enough heatmap that reads at a glance, not medical
illustration accuracy.

## 5. Screens & navigation

No new tab-bar entries. Reuses the two disabled buttons already scaffolded
in `app/(member)/profile/index.tsx` from Phase 1 (evidence the original
design anticipated this exact structure):

```
app/(member)/home.tsx                     # rewritten: real dashboard card
app/(member)/profile/index.tsx            # "Statistics"/"Measures" enabled
app/(member)/profile/statistics.tsx       # NEW: heatmap + exercise list
app/(member)/profile/measures.tsx         # NEW: log + trend + history
```

- **Home**: three stat tiles (Workouts this week, Volume Δ%, Streak) + a
  compact horizontal muscle-balance bar list (one bar per muscle group with
  nonzero volume this week, sorted descending, capped to the top 6 to keep
  the card compact — full detail lives on Statistics).
- **Statistics**: front/back toggle + `MuscleHeatmap`, then a scrollable
  list of exercises the user has logged at least once (name + a compact
  strength-trend sparkline placeholder is out of scope — tapping a row
  navigates to the existing exercise detail screen). The existing
  `SummaryTab` (Phase 2a) gains a real `VictoryLine` chart of
  `getStrengthTrend` data beneath its existing PR numbers — additive, no
  existing content removed.
- **Measures**: a type picker (Weight / Body Fat / Custom — Custom reveals a
  free-text label + unit input), a value input, a "Log" button; below it, a
  `VictoryLine` trend chart for the currently-selected type and a
  chronological list of past entries for that type (each with a delete
  action).
- `profile/index.tsx`'s "Calendar" button stays disabled (Phase 6 scope,
  unchanged).

## 6. API additions

- `src/features/progress/api.ts` (new module):
  - `getHomeSummary(): Promise<HomeSummary>` — `{ workoutCountThisWeek,
    volumeChangePct: number | null, streakDays: number, muscleVolumes:
    { muscle: string; volume: number }[] }` (raw per-muscle-string volumes,
    pre-zone-mapping — the heatmap component owns the muscle→zone lookup).
  - `getMuscleVolumes(): Promise<{ muscle: string; volume: number }[]>` —
    the same 7-day muscle aggregate `getHomeSummary` uses internally,
    exposed separately so the Statistics screen's heatmap doesn't need the
    other home-card fields.
- `src/features/progress/streak.ts` — pure `computeStreak`.
- `src/features/progress/volume.ts` — pure `computeVolumeChangePct`.
- `src/features/progress/muscleZones.ts` — the muscle→zone lookup table
  from §4, plus a pure `zoneVolumes(muscleVolumes): Record<Zone, number>`
  that folds the 17 muscle-keyed volumes into the 16 zone-keyed volumes the
  heatmap renders.
- `src/features/exercises/api.ts` (extended, alongside existing
  `getPersonalRecords`): `getStrengthTrend(exerciseId): Promise<{ date:
  string; maxWeight: number; best1RM: number }[]>`.
- `src/features/measurements/api.ts` (new module): `listMeasurements(type?:
  string): Promise<Measurement[]>`, `logMeasurement(type, value, unit):
  Promise<{ error: string | null }>`, `deleteMeasurement(id): Promise<{
  error: string | null }>`.

RLS: `getHomeSummary`/`getMuscleVolumes`/`getStrengthTrend` all read via
existing `workout_sessions_owner`/`workout_sets_owner` policies (Phase 1) —
no new policies. `body_measurements` gets its own owner-only policy (§2).

## 7. Out of scope (deferred)

- Anatomically precise muscle illustration (§4's stylized approach is the
  permanent v1, not a placeholder for a future redraw within this phase).
- Selectable time windows for the muscle-balance/heatmap (fixed 7-day window
  for both home and Statistics in v1).
- Calendar view, streak history/calendar visualization, monthly recap
  (Phase 6).
- Editing a logged measurement (delete + re-log covers the same need for
  v1).
- Admin-facing analytics (Phase 4).
