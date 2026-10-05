create function public.create_group(group_name text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_group_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before creating a group';
  end if;

  if group_name is null or char_length(trim(group_name)) not between 1 and 80 then
    raise exception 'Group name must be between 1 and 80 characters';
  end if;

  insert into public.groups (name, created_by)
  values (trim(group_name), current_user_id)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, current_user_id, 'owner');

  return new_group_id;
end;
$$;

revoke all on function public.create_group(text) from public, anon, authenticated;
grant execute on function public.create_group(text) to authenticated;
