alter table public.group_invites
  add column code_hash text,
  add column code_expires_at timestamptz;

create table public.group_invite_code_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);

alter table public.group_invite_code_attempts enable row level security;
revoke all on public.group_invite_code_attempts from public, anon, authenticated;

create function public.consume_group_invite_code_attempt()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_count integer;
  attempt_window timestamptz;
begin
  if current_user_id is null then
    raise exception 'Sign in before using an invite code';
  end if;

  insert into public.group_invite_code_attempts as attempts (
    user_id, window_started_at, attempts
  )
  values (current_user_id, now(), 1)
  on conflict (user_id) do update
  set window_started_at = case
        when attempts.window_started_at <= now() - interval '15 minutes' then now()
        else attempts.window_started_at
      end,
      attempts = case
        when attempts.window_started_at <= now() - interval '15 minutes' then 1
        else attempts.attempts + 1
      end
  returning attempts.attempts, attempts.window_started_at
  into attempt_count, attempt_window;

  if attempt_count > 10 and attempt_window > now() - interval '15 minutes' then
    raise exception 'Too many invite code attempts. Please wait 15 minutes and try again';
  end if;
end;
$$;

drop function public.create_group_invite(uuid);

create function public.create_group_invite(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite_token text;
  invite_code text;
  code_expires_at timestamptz := now() + interval '7 days';
begin
  if current_user_id is null then
    raise exception 'Sign in before creating an invite link';
  end if;

  if not exists (
    select 1
    from public.group_members as gm
    where gm.group_id = target_group_id
      and gm.user_id = current_user_id
      and gm.role = 'owner'
  ) then
    raise exception 'Only a group owner can create an invite link';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('postmarked-group-invite-code'),
    0
  );

  invite_token := rtrim(
    translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'),
    '='
  );

  loop
    select string_agg(
      chr(65 + pg_catalog.get_byte(random_bytes.bytes, alphabet.index) % 26),
      ''
      order by alphabet.index
    )
    into invite_code
    from (
      select extensions.gen_random_bytes(6) as bytes
    ) as random_bytes
    cross join generate_series(0, 5) as alphabet(index);

    exit when not exists (
      select 1
      from public.group_invites as gi
      where gi.code_hash is not null
        and gi.code_expires_at > now()
        and extensions.crypt(invite_code, gi.code_hash) = gi.code_hash
    );
  end loop;

  insert into public.group_invites (
    group_id, token_hash, code_hash, code_expires_at, generated_at
  )
  values (
    target_group_id,
    extensions.digest(invite_token, 'sha256'),
    extensions.crypt(invite_code, extensions.gen_salt('bf', 10)),
    code_expires_at,
    now()
  )
  on conflict (group_id) do update
    set token_hash = excluded.token_hash,
        code_hash = excluded.code_hash,
        code_expires_at = excluded.code_expires_at,
        generated_at = excluded.generated_at;

  return jsonb_build_object(
    'invite_token', invite_token,
    'invite_code', invite_code,
    'code_expires_at', code_expires_at
  );
end;
$$;

create or replace function public.preview_group_invite(invite_token text)
returns table (group_id uuid, group_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before opening an invite';
  end if;

  if invite_token ~ '^[A-Za-z]{6}$' then
    perform public.consume_group_invite_code_attempt();
    return query
    select g.id, g.name
    from public.group_invites as gi
    join public.groups as g on g.id = gi.group_id
    where gi.code_expires_at > now()
      and extensions.crypt(upper(invite_token), gi.code_hash) = gi.code_hash;
    return;
  end if;

  if invite_token is null
    or (
      invite_token !~ '^[A-Za-z0-9_-]{22}$'
      and invite_token !~ '^[0-9a-fA-F]{64}$'
    ) then
    return;
  end if;

  return query
  select g.id, g.name
  from public.group_invites as gi
  join public.groups as g on g.id = gi.group_id
  where gi.token_hash = extensions.digest(invite_token, 'sha256');
end;
$$;

create or replace function public.join_group_with_invite(invite_token text)
returns table (group_id uuid, group_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invited_group_id uuid;
  invited_group_name text;
begin
  if current_user_id is null then
    raise exception 'Sign in before joining a group';
  end if;

  if invite_token ~ '^[A-Za-z]{6}$' then
    perform public.consume_group_invite_code_attempt();
    select g.id, g.name into invited_group_id, invited_group_name
    from public.group_invites as gi
    join public.groups as g on g.id = gi.group_id
    where gi.code_expires_at > now()
      and extensions.crypt(upper(invite_token), gi.code_hash) = gi.code_hash;
  elsif invite_token is null
    or (
      invite_token !~ '^[A-Za-z0-9_-]{22}$'
      and invite_token !~ '^[0-9a-fA-F]{64}$'
    ) then
    raise exception 'This invite link is invalid or has been replaced';
  else
    select g.id, g.name into invited_group_id, invited_group_name
    from public.group_invites as gi
    join public.groups as g on g.id = gi.group_id
    where gi.token_hash = extensions.digest(invite_token, 'sha256');
  end if;

  if invited_group_id is null then
    raise exception 'This invite code is invalid or expired, or the link has been replaced';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (invited_group_id, current_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return query select invited_group_id, invited_group_name;
end;
$$;

revoke all on function public.create_group_invite(uuid) from public, anon, authenticated;
revoke all on function public.preview_group_invite(text) from public, anon, authenticated;
revoke all on function public.join_group_with_invite(text) from public, anon, authenticated;
revoke all on function public.consume_group_invite_code_attempt() from public, anon, authenticated;
grant execute on function public.create_group_invite(uuid) to authenticated;
grant execute on function public.preview_group_invite(text) to authenticated;
grant execute on function public.join_group_with_invite(text) to authenticated;
