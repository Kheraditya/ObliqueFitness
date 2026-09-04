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
