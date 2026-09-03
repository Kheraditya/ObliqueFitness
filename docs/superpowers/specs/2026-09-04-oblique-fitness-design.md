# Oblique Fitness — App Design & Feature Spec

**Status**: Approved for planning
**Date**: 2026-09-04
**Type**: Greenfield architectural build

## 1. Purpose & context

A gym / personal-training business tool, modeled on Hevy's workout-tracking UX,
built with React Native (Expo). Two roles:

- **Member** — logs workouts, tracks progress, views their own membership status.
- **Super admin (trainer/gym owner)** — everything a member can do, plus full
  visibility into every member's data, workout history, and progress; can
  assign routines and manage membership status/duration.

The two things called out as most important:

1. Progress visualization must be **clearer and more consolidated** than Hevy's
   (which spreads analytics across Profile/Statistics/Measurements/Calendar).
2. A **super admin** role with full cross-member visibility and routine
   assignment — this doesn't exist in Hevy at all.

## 2. Mind map

```
Oblique Fitness
│
├─ Auth & Onboarding
│  ├─ Sign up / login (Supabase Auth: email+password, Google/Apple)
│  ├─ Join gym via admin-issued invite code
│  └─ Profile setup (name, avatar, bio)
│
├─ Workout (member + admin-as-member)
│  ├─ Start empty workout
│  ├─ Start from routine
│  ├─ Live session: log sets (weight/reps/RPE), rest timer, supersets
│  ├─ Routines: create/edit/duplicate/delete/reorder
│  └─ Exercise library: search, filter (muscle/equipment), custom exercises
│
├─ Progress & Analytics  ★ core differentiator
│  ├─ Home index card: week-over-week volume %, workout count, streak,
│  │  muscle-balance indicator
│  ├─ Progress tab (consolidated, new vs. Hevy):
│  │  ├─ Per-exercise strength charts (max weight / est.1RM / volume)
│  │  ├─ Body measurement trends (weight, body fat %, custom)
│  │  └─ Muscle heatmap (custom SVG front/back body, shaded by volume)
│  ├─ Workout calendar (streaks, rest days)
│  └─ Monthly recap report
│
├─ Membership (member view)
│  ├─ View own plan/status/expiry (read-only)
│  └─ Expiry-approaching notification
│
├─ Social (gym-scoped, light)
│  ├─ Gym activity feed (workouts, PRs — same gym only)
│  └─ Opt-in leaderboard (e.g. weekly volume)
│
└─ Super Admin
   ├─ Member directory (search/filter by status, plan)
   ├─ Per-member detail
   │  ├─ Full workout history
   │  ├─ Same analytics components as member Progress tab
   │  └─ Current + past routines
   ├─ Routine assignment (push a routine onto a member's account)
   ├─ Membership management (dates, plan, status: active/frozen/expired)
   ├─ Invite code generation
   ├─ Gym-wide analytics (active members, workouts this week, expiring-soon)
   └─ Shared exercise library management
```

## 3. Tech stack

| Concern | Choice | Why |
|---|---|---|
| App framework | React Native + Expo (Expo Router, TypeScript) | Fast iteration, OTA updates, one codebase for iOS/Android |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) | Relational data fits membership/reporting joins; RLS gives clean member/admin data isolation without a custom API layer |
| Local cache / offline | expo-sqlite mirror + `pending_mutations` outbox table, synced via NetInfo listener | Gym wifi/cell is unreliable; lightweight outbox handles connectivity blips without the cost of a full offline-first DB (WatermelonDB has no official Supabase adapter) |
| Server-state layer | TanStack Query | Caching, retry, and offline-aware mutation handling pair naturally with the outbox pattern |
| Charts | victory-native or react-native-gifted-charts, + a custom SVG muscle-map component | Reference app's charts are placeholders ("No data yet"); this is the area to invest in |
| Auth roles | `users.role` (`member` \| `admin`) drives RLS policies and navigation branching | Single codebase, role-based screens |

No in-app paywall/PRO tier — active membership status (admin-controlled) is the
single access gate. No IAP integration needed.

## 4. Data model

```
gyms                  (id, name)
users                 (id, email, role[member|admin], gym_id, name, avatar_url, bio)
memberships           (id, user_id, plan_name, start_date, end_date, status[active|expired|frozen])
body_measurements     (id, user_id, type[weight|body_fat|...], value, logged_at)
exercises             (id, name, muscle_group, equipment, instructions, image_url, is_custom, created_by)
routines              (id, owner_id, assigned_by_admin_id NULL, name, notes)
routine_exercises     (id, routine_id, exercise_id, order, target_sets, rest_seconds)
workout_sessions      (id, user_id, routine_id NULL, started_at, ended_at, duration)
workout_sets          (id, session_id, exercise_id, set_number, weight, reps, rpe NULL, completed_at)
```

Row Level Security: members can only `SELECT`/`INSERT`/`UPDATE` rows where
`user_id = auth.uid()`. Admins get a policy allowing `SELECT`/`UPDATE` across
all users sharing their `gym_id`, and `INSERT` on `routines`/`memberships` for
those users (covers routine assignment and membership edits).

## 5. Feature list (detailed)

### Member-facing
- Auth: sign up, login, join gym via invite code, profile setup
- Workout: empty workout, start from routine, live logging (sets/reps/weight/RPE),
  rest timer, superset support, per-exercise notes
- Routines: CRUD, duplicate, reorder exercises
- Exercise library: search, filter by muscle/equipment, view instructions/image,
  create custom exercise
- Home dashboard index: week-over-week volume, workout count, streak, muscle-balance indicator
- Progress tab: strength progression charts, body measurement trends, muscle heatmap
- Calendar: streaks, rest days, month view
- Monthly recap report
- Membership: view own status/plan/expiry, expiry notification
- Social: gym-scoped activity feed, opt-in leaderboard

### Admin-facing (in addition to all member features)
- Member directory with search/filter
- Per-member detail: full history, full analytics (member components reused), routines
- Assign/reassign routines to any member
- Set/edit membership plan, dates, status
- Generate/manage gym invite codes
- Gym-wide analytics: active members, workouts this week, members expiring soon,
  most-used exercises/routines
- Manage shared exercise library, create assignable routine templates

## 6. Phased roadmap

1. **Foundation** — Expo scaffold, Supabase project + schema + RLS, auth, role-based navigation shell
2. **Core workout loop** — exercise library (seeded dataset), routines CRUD, live session logging, offline outbox + sync
3. **Progress & analytics** — Progress tab, home index card, muscle heatmap, measurements
4. **Admin (in-app)** — member directory, per-member detail/analytics, routine assignment, membership management, invite codes
5. **Social layer** — gym feed, leaderboard
6. **Polish** — notifications (rest timer, membership expiry), monthly recap, calendar/streaks
7. **Future phase** — standalone web admin dashboard (Next.js), same Supabase backend

Phases 1–3 produce a fully usable member app before admin features layer on top.

## 7. Explicitly out of scope (for now)

- In-app payments / PRO subscription tier
- Public profiles / cross-gym social features
- Multi-gym support beyond the schema placeholder (`gyms` table exists but UI assumes one gym)
- Wearable integrations (Apple Health, Garmin, etc.)
