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
  on conflict on constraint group_members_pkey do nothing;

  return query select invited_group_id, invited_group_name;
end;
$$;

revoke all on function public.join_group_with_invite(text) from public, anon, authenticated;
grant execute on function public.join_group_with_invite(text) to authenticated;
