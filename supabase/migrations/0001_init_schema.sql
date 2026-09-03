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
