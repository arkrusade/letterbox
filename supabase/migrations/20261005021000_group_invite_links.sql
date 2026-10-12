create table public.group_invites (
  group_id uuid primary key references public.groups (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  generated_at timestamptz not null default now()
);

alter table public.group_invites enable row level security;
revoke all on public.group_invites from public, anon, authenticated;

create function public.create_group_invite(target_group_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite_token text := encode(extensions.gen_random_bytes(32), 'hex');
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

  insert into public.group_invites (group_id, token_hash)
  values (target_group_id, extensions.digest(invite_token, 'sha256'))
  on conflict (group_id) do update
    set token_hash = excluded.token_hash,
        generated_at = now();

  return invite_token;
end;
$$;

create function public.preview_group_invite(invite_token text)
returns table (group_id uuid, group_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before opening an invite';
  end if;

  if invite_token is null or invite_token !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  return query
  select g.id, g.name
  from public.group_invites as gi
  join public.groups as g on g.id = gi.group_id
  where gi.token_hash = extensions.digest(invite_token, 'sha256');
end;
$$;

create function public.join_group_with_invite(invite_token text)
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

  if invite_token is null or invite_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This invite link is invalid or has been replaced';
  end if;

  select g.id, g.name into invited_group_id, invited_group_name
  from public.group_invites as gi
  join public.groups as g on g.id = gi.group_id
  where gi.token_hash = extensions.digest(invite_token, 'sha256');

  if invited_group_id is null then
    raise exception 'This invite link is invalid or has been replaced';
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
grant execute on function public.create_group_invite(uuid) to authenticated;
grant execute on function public.preview_group_invite(text) to authenticated;
grant execute on function public.join_group_with_invite(text) to authenticated;
