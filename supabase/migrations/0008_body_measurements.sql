create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  value numeric not null,
  unit text not null,
  logged_at timestamptz not null default now()
);

alter table body_measurements enable row level security;

create policy "body_measurements_owner" on body_measurements
  for all using (user_id = auth.uid());

create policy "body_measurements_admin_read" on body_measurements
  for select using (
    current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    )
  );
