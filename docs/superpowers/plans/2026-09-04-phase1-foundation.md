# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Expo app skeleton, Supabase schema/RLS, auth (sign up/login/join gym), and a role-based navigation shell so a member or admin can log in and land on the correct empty home screen.

**Architecture:** Expo Router (file-based routing) with three route groups — `(auth)`, `(member)`, `(admin)` — gated by a single root `app/index.tsx` that reads auth/session state and redirects. All backend access goes through Supabase (Postgres + Auth), with role (`member`/`admin`) stored on a `public.users` row and enforced via Row Level Security. Business logic (validation, API calls, routing decisions) is extracted into plain, unit-testable functions/hooks under `src/`, kept separate from the route screen files so it can be tested without rendering full navigation.

**Tech Stack:** Expo (TypeScript, Expo Router), Supabase (`@supabase/supabase-js`, Supabase CLI for local migrations), Jest (`jest-expo` preset) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-04-oblique-fitness-design.md`

## Global Constraints

- TypeScript throughout, no `any` in new code.
- Navigation via Expo Router (file-based routes under `app/`).
- Supabase is the only backend — no custom REST/GraphQL server.
- Role lives on `public.users.role` (`member` | `admin`) and drives both RLS policies and UI branching.
- No in-app payments/IAP — membership/access gating is admin-controlled data, not a paywall.
- Client-exposed env vars must use the `EXPO_PUBLIC_` prefix (Expo convention).

---

## File Structure

```
app/
  _layout.tsx              # root layout (renders <Slot />)
  index.tsx                # reads auth state, redirects via getInitialRoute
  (auth)/
    _layout.tsx
    login.tsx
    signup.tsx
    join-gym.tsx
  (member)/
    _layout.tsx
    home.tsx
  (admin)/
    _layout.tsx
    dashboard.tsx
src/
  lib/
    supabase.ts             # Supabase client singleton
    supabase.test.ts
  features/
    auth/
      types.ts              # Role, Profile
      validation.ts         # isValidEmail, isValidPassword
      validation.test.ts
      api.ts                # signUp, signIn, signOut, getCurrentUserProfile, redeemInviteCode
      api.test.ts
      useAuth.ts             # session + profile reactive hook
      useAuth.test.ts
      navigation.ts          # getInitialRoute (pure)
      navigation.test.ts
supabase/
  migrations/
    0001_init_schema.sql
    0002_rls_policies.sql
    0003_invite_codes.sql
.env.example
jest.config.js
```

---

### Task 1: Project scaffold — Expo, TypeScript, Expo Router, test harness

**Files:**
- Create: entire Expo project (via CLI) at repo root
- Create: `app/_layout.tsx`, `app/index.tsx`
- Create: `jest.config.js`
- Create: `src/App.test.tsx` (temporary smoke test, superseded by Task 9's real index test — kept here only to prove the harness works)

**Interfaces:**
- Produces: a running Expo project with Expo Router configured (`app/` directory drives routing), and a working Jest + RTL test harness other tasks build on.

- [ ] **Step 1: Scaffold the Expo project into a temp folder, then move it into the repo (repo already has `docs/` and `.git`)**

```bash
cd "/d/Projects"
npx create-expo-app@latest ObliqueFitness-scaffold --template blank-typescript
rm -rf ObliqueFitness-scaffold/.git
cp -r ObliqueFitness-scaffold/. ObliqueFitness/
rm -rf ObliqueFitness-scaffold
cd ObliqueFitness
```

- [ ] **Step 2: Install Expo Router and its required peer packages**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 3: Point the app entry at Expo Router**

Edit `package.json`, set the `main` field:

```json
"main": "expo-router/entry"
```

Edit `app.json`, add a `scheme` (required by Expo Router for deep linking) inside `"expo"`:

```json
"scheme": "obliquefitness"
```

- [ ] **Step 4: Install the test harness**

```bash
npx expo install jest-expo jest @testing-library/react-native react-test-renderer --dev
```

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-router|expo-modules-core|expo-linking|expo-constants|expo-status-bar|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

Add to `package.json` `"scripts"`:

```json
"test": "jest"
```

- [ ] **Step 5: Write a failing smoke test for the root screen**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import Index from '../app/index';

describe('app/index', () => {
  it('renders without crashing', () => {
    render(<Index />);
    expect(screen).toBeDefined();
  });
});
```

- [ ] **Step 6: Run the test, confirm it fails**

Run: `npx jest src/App.test.tsx`
Expected: FAIL — `Cannot find module '../app/index'` (file doesn't exist yet with expected default export).

- [ ] **Step 7: Create the minimal root layout and index screen**

Create `app/_layout.tsx`:

```tsx
import { Slot } from 'expo-router';

export default function RootLayout() {
  return <Slot />;
}
```

Create `app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View>
      <Text>Oblique Fitness</Text>
    </View>
  );
}
```

- [ ] **Step 8: Run the test, confirm it passes**

Run: `npx jest src/App.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app with Expo Router and Jest test harness"
```

---

### Task 2: Supabase client module

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/supabase.test.ts`
- Create: `.env.example`
- Modify: `package.json` (add `@supabase/supabase-js`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`)

**Interfaces:**
- Produces: `supabase` — a configured `SupabaseClient` singleton, imported by every later task that talks to the backend.

- [ ] **Step 1: Install dependencies**

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage
```

- [ ] **Step 2: Create `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/supabase.test.ts`:

```ts
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mocked: true })),
}));

describe('supabase client', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('creates a client with the configured url, anon key, and persistent session storage', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    await import('./supabase');

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
        }),
      })
    );
  });
});
```

- [ ] **Step 4: Run the test, confirm it fails**

Run: `npx jest src/lib/supabase.test.ts`
Expected: FAIL — `Cannot find module './supabase'`

- [ ] **Step 5: Implement the client**

Create `src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 6: Run the test, confirm it passes**

Run: `npx jest src/lib/supabase.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add configured Supabase client singleton"
```

---

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: tables `gyms`, `users`, `memberships`, `exercises`, `routines`, `routine_exercises`, `workout_sessions`, `workout_sets`, plus a trigger that auto-creates a `public.users` row (role `member`, `gym_id` null) whenever a Supabase Auth user signs up. Later tasks (Task 6 onward) query these tables/columns by the exact names defined here.

- [ ] **Step 1: Prerequisite check — Supabase CLI and Docker**

Run: `npx supabase --version`
If not found: `npm install -g supabase`
Docker Desktop must be running (Supabase CLI runs Postgres locally in a container).

- [ ] **Step 2: Initialize the local Supabase project**

```bash
npx supabase init
```

- [ ] **Step 3: Write the schema migration**

Create `supabase/migrations/0001_init_schema.sql`:

```sql
create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  gym_id uuid references gyms(id) on delete set null,
  name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan_name text not null,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'expired', 'frozen')),
  created_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  equipment text,
  instructions text,
  image_url text,
  is_custom boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  assigned_by_admin_id uuid references users(id) on delete set null,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  "order" integer not null default 0,
  target_sets integer not null default 3,
  rest_seconds integer not null default 90
);

create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  routine_id uuid references routines(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer
);

create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  set_number integer not null,
  weight numeric,
  reps integer,
  rpe numeric,
  completed_at timestamptz not null default now()
);

-- Auto-create a public.users profile row whenever a Supabase Auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, gym_id)
  values (new.id, new.email, 'member', null);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

- [ ] **Step 4: Apply the migration locally and verify it succeeds**

```bash
npx supabase start
npx supabase db reset
```

Expected: both commands exit with status 0 and no `ERROR` lines in the output — this confirms every `CREATE TABLE`/trigger statement ran cleanly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add initial database schema migration"
```

---

### Task 4: Row Level Security policies

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Consumes: tables from Task 3.
- Produces: RLS enabled on every table from Task 3, with policies matching spec section 4 — members act only on their own rows; admins act on any row belonging to a user in their own `gym_id`.

- [ ] **Step 1: Write the RLS migration**

Create `supabase/migrations/0002_rls_policies.sql`:

```sql
alter table users enable row level security;
alter table memberships enable row level security;
alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_sets enable row level security;

-- Helper: is the current user an admin, and in which gym?
create function current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

create function current_user_gym_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select gym_id from users where id = auth.uid();
$$;

-- users: self, or admin viewing/editing same-gym members
create policy "users_select_self_or_same_gym_admin" on users
  for select using (
    id = auth.uid()
    or (current_user_is_admin() and gym_id = current_user_gym_id())
  );

create policy "users_update_self_or_same_gym_admin" on users
  for update using (
    id = auth.uid()
    or (current_user_is_admin() and gym_id = current_user_gym_id())
  );

-- memberships: self (read-only), admin full access within gym
create policy "memberships_select_self_or_same_gym_admin" on memberships
  for select using (
    user_id = auth.uid()
    or (current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    ))
  );

create policy "memberships_admin_manage" on memberships
  for all using (
    current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    )
  );

-- exercises: readable by anyone authenticated; writable by creator or admin
create policy "exercises_select_authenticated" on exercises
  for select using (auth.role() = 'authenticated');

create policy "exercises_insert_own" on exercises
  for insert with check (created_by = auth.uid());

create policy "exercises_update_own_or_admin" on exercises
  for update using (created_by = auth.uid() or current_user_is_admin());

-- routines: owner full access; admin full access within gym
create policy "routines_owner_or_same_gym_admin" on routines
  for all using (
    owner_id = auth.uid()
    or (current_user_is_admin() and owner_id in (
      select id from users where gym_id = current_user_gym_id()
    ))
  );

-- routine_exercises: follow parent routine's access
create policy "routine_exercises_via_routine" on routine_exercises
  for all using (
    routine_id in (
      select id from routines where owner_id = auth.uid()
      or (current_user_is_admin() and owner_id in (
        select id from users where gym_id = current_user_gym_id()
      ))
    )
  );

-- workout_sessions: owner full access; admin read-only within gym
create policy "workout_sessions_owner" on workout_sessions
  for all using (user_id = auth.uid());

create policy "workout_sessions_admin_read" on workout_sessions
  for select using (
    current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    )
  );

-- workout_sets: follow parent session's access
create policy "workout_sets_owner" on workout_sets
  for all using (
    session_id in (select id from workout_sessions where user_id = auth.uid())
  );

create policy "workout_sets_admin_read" on workout_sets
  for select using (
    current_user_is_admin() and session_id in (
      select id from workout_sessions where user_id in (
        select id from users where gym_id = current_user_gym_id()
      )
    )
  );
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db reset
```

Expected: exits with status 0, no `ERROR` lines — confirms every policy and helper function was created against the Task 3 schema without error.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add row level security policies for member/admin data isolation"
```

---

### Task 5: Auth validation helpers

**Files:**
- Create: `src/features/auth/types.ts`
- Create: `src/features/auth/validation.ts`
- Create: `src/features/auth/validation.test.ts`

**Interfaces:**
- Produces: `Role`, `Profile` types (used by every subsequent auth task); `isValidEmail(email: string): boolean`, `isValidPassword(password: string): boolean` (min 8 chars).

- [ ] **Step 1: Create the shared types**

Create `src/features/auth/types.ts`:

```ts
export type Role = 'member' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  gym_id: string | null;
  name: string | null;
  avatar_url: string | null;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/auth/validation.test.ts`:

```ts
import { isValidEmail, isValidPassword } from './validation';

describe('isValidEmail', () => {
  it('accepts a well-formed email', () => {
    expect(isValidEmail('trainer@gym.com')).toBe(true);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts a password with 8 or more characters', () => {
    expect(isValidPassword('longenough')).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(isValidPassword('short')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests, confirm they fail**

Run: `npx jest src/features/auth/validation.test.ts`
Expected: FAIL — `Cannot find module './validation'`

- [ ] **Step 4: Implement**

Create `src/features/auth/validation.ts`:

```ts
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `npx jest src/features/auth/validation.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth validation helpers and shared auth types"
```

---

### Task 6: Auth API functions

**Files:**
- Create: `src/features/auth/api.ts`
- Create: `src/features/auth/api.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `Profile` (Task 5).
- Produces: `signUp(email, password): Promise<{ error: string | null }>`, `signIn(email, password): Promise<{ error: string | null }>`, `signOut(): Promise<void>`, `getCurrentUserProfile(): Promise<Profile | null>` — used by screens (Task 9) and `useAuth` (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { signUp, signIn, signOut, getCurrentUserProfile } from './api';

describe('signUp', () => {
  it('returns no error on success', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: {}, error: null });
    const result = await signUp('a@b.com', 'password123');
    expect(supabase.auth.signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
    expect(result).toEqual({ error: null });
  });

  it('returns the error message on failure', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: {}, error: { message: 'Email already in use' } });
    const result = await signUp('a@b.com', 'password123');
    expect(result).toEqual({ error: 'Email already in use' });
  });
});

describe('signIn', () => {
  it('returns no error on success', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null });
    const result = await signIn('a@b.com', 'password123');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
    expect(result).toEqual({ error: null });
  });

  it('returns the error message on invalid credentials', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
    const result = await signIn('a@b.com', 'wrong');
    expect(result).toEqual({ error: 'Invalid login credentials' });
  });
});

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('getCurrentUserProfile', () => {
  it('returns null when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const profile = await getCurrentUserProfile();
    expect(profile).toBeNull();
  });

  it('returns the profile row for the current session user', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const single = jest.fn().mockResolvedValue({
      data: { id: 'user-1', email: 'a@b.com', role: 'member', gym_id: null, name: null, avatar_url: null },
      error: null,
    });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const profile = await getCurrentUserProfile();

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(profile).toEqual({
      id: 'user-1', email: 'a@b.com', role: 'member', gym_id: null, name: null, avatar_url: null,
    });
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/auth/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement**

Create `src/features/auth/api.ts`:

```ts
import { supabase } from '../../lib/supabase';
import type { Profile } from './types';

export async function signUp(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error ? error.message : null };
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? error.message : null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return data as Profile | null;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/auth/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth API functions (sign up, sign in, sign out, get profile)"
```

---

### Task 7: Invite code redemption (join gym)

**Files:**
- Create: `supabase/migrations/0003_invite_codes.sql`
- Modify: `src/features/auth/api.ts` (add `redeemInviteCode`)
- Modify: `src/features/auth/api.test.ts` (add tests)

**Interfaces:**
- Consumes: `supabase` (Task 2).
- Produces: `redeemInviteCode(code: string): Promise<{ error: string | null }>` — used by the join-gym screen (Task 9).

- [ ] **Step 1: Write the invite codes migration**

Create `supabase/migrations/0003_invite_codes.sql`:

```sql
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  code text not null unique,
  created_by uuid references users(id) on delete set null,
  max_uses integer not null default 1,
  uses_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invite_codes enable row level security;

create policy "invite_codes_admin_manage" on invite_codes
  for all using (
    current_user_is_admin() and gym_id = current_user_gym_id()
  );

-- Redeems a code for the calling user: validates it, attaches the user to
-- the gym, and increments the usage count, all in one atomic transaction.
create function redeem_invite_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code invite_codes%rowtype;
begin
  select * into v_code from invite_codes where code = p_code for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'Invite code has expired';
  end if;

  if v_code.uses_count >= v_code.max_uses then
    raise exception 'Invite code has already been used';
  end if;

  update users set gym_id = v_code.gym_id where id = auth.uid();
  update invite_codes set uses_count = uses_count + 1 where id = v_code.id;
end;
$$;
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db reset
```

Expected: exits with status 0, no `ERROR` lines.

- [ ] **Step 3: Write the failing test**

Add to `src/features/auth/api.test.ts`:

```ts
describe('redeemInviteCode', () => {
  it('returns no error on success', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
    const result = await redeemInviteCode('ABC123');
    expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite_code', { p_code: 'ABC123' });
    expect(result).toEqual({ error: null });
  });

  it('returns the error message when the code is invalid', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: 'Invalid invite code' } });
    const result = await redeemInviteCode('BADCODE');
    expect(result).toEqual({ error: 'Invalid invite code' });
  });
});
```

Update the mock and import at the top of `src/features/auth/api.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { signUp, signIn, signOut, getCurrentUserProfile, redeemInviteCode } from './api';
```

- [ ] **Step 4: Run the tests, confirm the new ones fail**

Run: `npx jest src/features/auth/api.test.ts`
Expected: FAIL — `redeemInviteCode is not a function`

- [ ] **Step 5: Implement**

Add to `src/features/auth/api.ts`:

```ts
export async function redeemInviteCode(code: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('redeem_invite_code', { p_code: code });
  return { error: error ? error.message : null };
}
```

- [ ] **Step 6: Run the tests, confirm they pass**

Run: `npx jest src/features/auth/api.test.ts`
Expected: PASS (all tests in the file, including Task 6's)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add invite code redemption for joining a gym"
```

---

### Task 8: `useAuth` hook

**Files:**
- Create: `src/features/auth/useAuth.ts`
- Create: `src/features/auth/useAuth.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 2), `getCurrentUserProfile` (Task 6), `Profile` (Task 5).
- Produces: `useAuth(): { loading: boolean; session: Session | null; profile: Profile | null }` — used by `app/index.tsx` (Task 9) to decide where to route.

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/useAuth.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

jest.mock('./api', () => ({
  getCurrentUserProfile: jest.fn(),
}));

import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from './api';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('starts in a loading state with no session or profile', () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth());
    expect(result.current).toEqual({ loading: true, session: null, profile: null });
  });

  it('resolves to no session and no profile when logged out', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('loads the profile when a session exists', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    const fakeProfile = { id: 'user-1', email: 'a@b.com', role: 'member', gym_id: null, name: null, avatar_url: null };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: fakeSession } });
    (getCurrentUserProfile as jest.Mock).mockResolvedValue(fakeProfile);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.profile).toEqual(fakeProfile);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx jest src/features/auth/useAuth.test.ts`
Expected: FAIL — `Cannot find module './useAuth'`

- [ ] **Step 3: Implement**

Create `src/features/auth/useAuth.ts`:

```ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from './api';
import type { Profile } from './types';

export interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, profile: null });

  useEffect(() => {
    let isMounted = true;

    async function loadForSession(session: Session | null) {
      if (!session) {
        if (isMounted) setState({ loading: false, session: null, profile: null });
        return;
      }
      const profile = await getCurrentUserProfile();
      if (isMounted) setState({ loading: false, session, profile });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadForSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }));
      loadForSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx jest src/features/auth/useAuth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add useAuth hook for reactive session and profile state"
```

---

### Task 9: Role-based navigation shell

**Files:**
- Create: `src/features/auth/navigation.ts`
- Create: `src/features/auth/navigation.test.ts`
- Modify: `app/index.tsx`
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/join-gym.tsx`
- Create: `app/(member)/_layout.tsx`, `app/(member)/home.tsx`
- Create: `app/(admin)/_layout.tsx`, `app/(admin)/dashboard.tsx`
- Delete: `src/App.test.tsx` (Task 1's throwaway smoke test — this task's `app/index.test.tsx` supersedes it)
- Create: `app/index.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 8), `Profile`/`Role` (Task 5), `signUp`/`signIn`/`signOut`/`redeemInviteCode` (Tasks 6–7).
- Produces: a working login → join-gym → role-appropriate-home flow.

- [ ] **Step 1: Write the failing test for the pure routing decision**

Create `src/features/auth/navigation.test.ts`:

```ts
import { getInitialRoute } from './navigation';
import type { Profile } from './types';

const session = { user: { id: 'user-1' } } as any;
const memberProfile: Profile = { id: 'user-1', email: 'a@b.com', role: 'member', gym_id: 'gym-1', name: null, avatar_url: null };
const adminProfile: Profile = { ...memberProfile, role: 'admin' };
const noGymProfile: Profile = { ...memberProfile, gym_id: null };

describe('getInitialRoute', () => {
  it('routes to login when there is no session', () => {
    expect(getInitialRoute(null, null)).toBe('/(auth)/login');
  });

  it('routes to join-gym when the profile has no gym_id', () => {
    expect(getInitialRoute(session, noGymProfile)).toBe('/(auth)/join-gym');
  });

  it('routes members to the member home', () => {
    expect(getInitialRoute(session, memberProfile)).toBe('/(member)/home');
  });

  it('routes admins to the admin dashboard', () => {
    expect(getInitialRoute(session, adminProfile)).toBe('/(admin)/dashboard');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx jest src/features/auth/navigation.test.ts`
Expected: FAIL — `Cannot find module './navigation'`

- [ ] **Step 3: Implement the pure routing decision**

Create `src/features/auth/navigation.ts`:

```ts
import type { Session } from '@supabase/supabase-js';
import type { Profile } from './types';

export type InitialRoute = '/(auth)/login' | '/(auth)/join-gym' | '/(member)/home' | '/(admin)/dashboard';

export function getInitialRoute(session: Session | null, profile: Profile | null): InitialRoute {
  if (!session) return '/(auth)/login';
  if (!profile || !profile.gym_id) return '/(auth)/join-gym';
  return profile.role === 'admin' ? '/(admin)/dashboard' : '/(member)/home';
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx jest src/features/auth/navigation.test.ts`
Expected: PASS

- [ ] **Step 5: Build the route screens**

Create `app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(auth)/login.tsx`:

```tsx
import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { signIn } from '../../src/features/auth/api';
import { isValidEmail } from '../../src/features/auth/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      return;
    }
    router.replace('/');
  }

  return (
    <View>
      <Text>Log In</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text>{error}</Text>}
      <Button title="Log In" onPress={handleSubmit} />
      <Button title="Sign Up" onPress={() => router.push('/(auth)/signup')} />
    </View>
  );
}
```

Create `app/(auth)/signup.tsx`:

```tsx
import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { signUp } from '../../src/features/auth/api';
import { isValidEmail, isValidPassword } from '../../src/features/auth/validation';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters');
      return;
    }
    const { error: signUpError } = await signUp(email, password);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    router.replace('/');
  }

  return (
    <View>
      <Text>Sign Up</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text>{error}</Text>}
      <Button title="Sign Up" onPress={handleSubmit} />
    </View>
  );
}
```

Create `app/(auth)/join-gym.tsx`:

```tsx
import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { redeemInviteCode } from '../../src/features/auth/api';

export default function JoinGym() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const { error: redeemError } = await redeemInviteCode(code);
    if (redeemError) {
      setError(redeemError);
      return;
    }
    router.replace('/');
  }

  return (
    <View>
      <Text>Enter your gym's invite code</Text>
      <TextInput placeholder="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" />
      {error && <Text>{error}</Text>}
      <Button title="Join Gym" onPress={handleSubmit} />
    </View>
  );
}
```

Create `app/(member)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function MemberLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(member)/home.tsx`:

```tsx
import { Button, Text, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../src/features/auth/api';

export default function MemberHome() {
  return (
    <View>
      <Text>Welcome, member</Text>
      <Button title="Sign Out" onPress={async () => { await signOut(); router.replace('/'); }} />
    </View>
  );
}
```

Create `app/(admin)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(admin)/dashboard.tsx`:

```tsx
import { Button, Text, View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../src/features/auth/api';

export default function AdminDashboard() {
  return (
    <View>
      <Text>Welcome, admin</Text>
      <Button title="Sign Out" onPress={async () => { await signOut(); router.replace('/'); }} />
    </View>
  );
}
```

- [ ] **Step 6: Delete the Task 1 throwaway smoke test**

```bash
rm src/App.test.tsx
```

- [ ] **Step 7: Write the failing test for `app/index.tsx`**

Create `app/index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

jest.mock('../src/features/auth/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>redirect:{href}</Text>;
  },
}));

import { useAuth } from '../src/features/auth/useAuth';
import Index from './index';

describe('app/index', () => {
  it('shows nothing that redirects while auth state is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: true, session: null, profile: null });
    render(<Index />);
    expect(screen.queryByText(/redirect:/)).toBeNull();
  });

  it('redirects to login when logged out', () => {
    (useAuth as jest.Mock).mockReturnValue({ loading: false, session: null, profile: null });
    render(<Index />);
    expect(screen.getByText('redirect:/(auth)/login')).toBeTruthy();
  });

  it('redirects admins to the admin dashboard', () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: false,
      session: { user: { id: 'user-1' } },
      profile: { id: 'user-1', email: 'a@b.com', role: 'admin', gym_id: 'gym-1', name: null, avatar_url: null },
    });
    render(<Index />);
    expect(screen.getByText('redirect:/(admin)/dashboard')).toBeTruthy();
  });
});
```

- [ ] **Step 8: Run the test, confirm it fails**

Run: `npx jest app/index.test.tsx`
Expected: FAIL — `app/index.tsx` still renders static "Oblique Fitness" text, no redirect logic.

- [ ] **Step 9: Implement the real `app/index.tsx`**

Replace the contents of `app/index.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/useAuth';
import { getInitialRoute } from '../src/features/auth/navigation';

export default function Index() {
  const { loading, session, profile } = useAuth();

  if (loading) return null;

  return <Redirect href={getInitialRoute(session, profile)} />;
}
```

- [ ] **Step 10: Run the test, confirm it passes**

Run: `npx jest app/index.test.tsx`
Expected: PASS

- [ ] **Step 11: Run the full test suite**

Run: `npx jest`
Expected: all suites pass.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add role-based navigation shell (auth, member, admin route groups)"
```

---

## Manual verification (after all tasks)

Automated tests cover logic; the following still needs a human/manual pass since it requires a real Supabase project and a device/simulator:

1. Create a real Supabase project, run `npx supabase link` and `npx supabase db push` to apply the three migrations.
2. Copy `.env.example` to `.env` with the real project URL/anon key.
3. Run `npx expo start`, sign up a new account, confirm it lands on `/(auth)/join-gym`.
4. In the Supabase SQL editor, insert a `gyms` row and an `invite_codes` row for it; redeem that code in the app and confirm it lands on `/(member)/home`.
5. Manually flip that user's `role` to `admin` in the `users` table, restart the app, confirm it now lands on `/(admin)/dashboard`.
