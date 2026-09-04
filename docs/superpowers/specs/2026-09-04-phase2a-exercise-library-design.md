# Phase 2a: Member Tab Shell + Exercise Library — Design Spec

**Status**: Approved for planning
**Date**: 2026-09-04
**Type**: Architectural (new subsystem, builds on Phase 1)
**Parent spec**: `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`

## 1. Purpose & context

Phase 1 shipped auth and a role-based redirect, but the member experience
past login is a single bare "Welcome, member" screen — there is no tab
navigation and no exercise library yet, even though both were always part
of the member feature set in the parent spec.

This phase builds:
1. The member-facing tab shell (Home / Workout / Profile), matching the
   reference app's navigation.
2. A real exercise library: seeded data, a searchable/filterable list, and
   a 4-tab exercise detail screen (Summary, History, How-to, Leaderboard).

**Explicitly deferred to Phase 2b**: live workout session logging and
routine CRUD. History, personal records, and the leaderboard are built
against real queries now, so they render correctly (empty) today and
populate automatically once Phase 2b starts writing to `workout_sessions`/
`workout_sets`. Home and Workout tabs are lightweight placeholders for the
same reason — their real content (analytics dashboard, routine list) is
Phase 3 and Phase 2b's job respectively.

## 2. Data model changes

Phase 1's `exercises` table is too thin for this screen (single
`muscle_group` text field, single `instructions` text field, no image
array). Migration `0004_exercise_library_schema.sql`:

```sql
alter table exercises
  drop column muscle_group,
  add column primary_muscles text[] not null default '{}',
  add column secondary_muscles text[] not null default '{}';

alter table exercises
  alter column instructions type text[] using case when instructions is null then '{}' else array[instructions] end;

alter table exercises
  add column images text[] not null default '{}';

alter table users
  add column leaderboard_opt_in boolean not null default false;
```

(Safe to drop/retype `exercises` columns outright — Phase 1 never seeded
real data into this table, so there is nothing to preserve.)

## 3. Seed data

Source: **free-exercise-db** (public-domain dataset, ~800 exercises with
name, category, equipment, primary/secondary muscles, step-by-step
instructions, and demonstration photos). Verify the license file in the
vendored snapshot at implementation time before relying on it.

Process: fetch/vendor the dataset's JSON, transform it into SQL `insert`
statements matching the new schema (name, primary_muscles, secondary_muscles,
equipment, instructions, images, is_custom = false, created_by = null),
and commit the result as `supabase/migrations/0005_seed_exercise_library.sql`
— a real migration (not `supabase/seed.sql`), so it applies via
`supabase db push` the same way every other schema change does, keeping
local and hosted consistent. Images are referenced by their existing
hosted URLs from the dataset (no Supabase Storage setup in this phase).

## 4. Personal records & leaderboard — exact formulas

All computed from `workout_sets` joined to `workout_sessions` (to get
`user_id`) for a given `exercise_id`.

- **Heaviest Weight**: `max(weight)` across the user's own sets for this exercise.
- **Best 1RM**: `max(weight * (1 + reps / 30.0))` (Epley formula) across the user's own sets.
- **Best Set Volume**: `max(weight * reps)` across the user's own sets (single best set).
- **Best Session Volume**: for each of the user's sessions, `sum(weight * reps)` across that session's sets of this exercise, then `max` across sessions.

All four are `null`/"-" when the user has no sets logged for that exercise
(the expected Phase 2a state).

**Leaderboard** (gym-wide, opt-in only): ranks by all-time heaviest weight
(not 1RM) per user, among users who share the viewer's `gym_id` and have
`leaderboard_opt_in = true`. Exposed only through a narrow
`security definer` Postgres function — not a client-side query against
`workout_sets` directly, since a member has no RLS visibility into other
members' sets:

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

This function returns only a name and a single aggregated number per
opted-in user — never raw set/session rows — and is scoped to the caller's
own gym, applying the lessons from Phase 1's RLS fixes (explicit
`auth.uid()` guard, explicit grant tightening, minimal data exposure) from
the start rather than after a review catches a gap.

## 5. Navigation structure

```
app/(member)/
  _layout.tsx                       # Tabs: Home, Workout, Profile
  home.tsx                          # placeholder
  workout.tsx                       # placeholder (disabled "Start Empty Workout")
  profile/
    _layout.tsx                     # Stack, so Exercises can drill down
    index.tsx                       # Profile home: user info, dashboard grid, Sign Out
    exercises/
      index.tsx                     # searchable/filterable exercise list
      [id].tsx                      # exercise detail, 4 tabs (Summary/History/How-to/Leaderboard)
```

**Profile home dashboard grid**: "Exercises" (functional, → exercises
list), "Statistics", "Measures", "Calendar" (placeholder links — Phase 3).
Sign Out button moves here from the old bare home screen.

**Home tab**: placeholder text ("Welcome back" + a note that the dashboard
is coming soon).

**Workout tab**: placeholder — a disabled "Start Empty Workout" button and
an empty "Routines" section message, matching the reference app's layout
without the underlying functionality (Phase 2b).

**Exercise list**: search bar (filters by name client-side or via a simple
`ilike` query) + equipment/muscle filter chips, scrollable list of
name + primary muscle + thumbnail.

**Exercise detail**: tab bar (Summary / History / How-to / Leaderboard).
- Summary: hero image, name, "Primary: X" / "Secondary: Y, Z" text, the
  four personal-record rows from section 4 (each "-" until Phase 2b).
- History: list of the user's own past sessions logging this exercise
  (empty state "No history yet" until Phase 2b).
- How-to: numbered list from `instructions`.
- Leaderboard: ranked list from `get_exercise_leaderboard`, with an
  "Show me on leaderboards" opt-in toggle if the viewer hasn't enabled it
  yet (writes `users.leaderboard_opt_in`).

## 6. Out of scope (deferred)

- Live workout session logging, routine CRUD (Phase 2b)
- Home dashboard analytics, muscle heatmap (Phase 3)
- Admin screens (Phase 4) — untouched by this phase
- Strength Level gauge (needs external strength-standards data — revisit later)
- Supabase Storage for exercise images (using the dataset's hosted URLs directly for now)
