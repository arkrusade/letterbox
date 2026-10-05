create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Friend',
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete restrict,
  time_zone text not null default 'UTC',
  cadence_days integer not null default 14 check (cadence_days between 1 and 365),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.newsletters (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null default 'A little letter',
  status text not null default 'open' check (status in ('open', 'sent')),
  started_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (status = 'open' and sent_at is null)
    or (status = 'sent' and sent_at is not null)
  )
);

create unique index newsletters_one_open_per_group
  on public.newsletters (group_id)
  where status = 'open';

create index newsletters_group_started_at_idx
  on public.newsletters (group_id, started_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 500),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (newsletter_id, author_user_id)
);

create index questions_newsletter_position_idx
  on public.questions (newsletter_id, position, created_at);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create index responses_question_created_at_idx
  on public.responses (question_id, created_at);

create function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members as gm
    where gm.group_id = target_group_id
      and gm.user_id = (select auth.uid())
  );
$$;

create function public.is_group_owner(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members as gm
    where gm.group_id = target_group_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'owner'
  );
$$;

create function public.is_group_creator(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups as g
    where g.id = target_group_id
      and g.created_by = (select auth.uid())
  );
$$;

create function public.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = (select auth.uid())
    or exists (
      select 1
      from public.group_members as mine
      join public.group_members as theirs on theirs.group_id = mine.group_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = target_user_id
    );
$$;

create function public.can_access_question(
  target_question_id uuid,
  require_open boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.questions as q
    join public.newsletters as n on n.id = q.newsletter_id
    join public.group_members as gm on gm.group_id = n.group_id
    where q.id = target_question_id
      and gm.user_id = (select auth.uid())
      and (not require_open or n.status = 'open')
  );
$$;

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Friend')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger responses_set_updated_at
  before update on public.responses
  for each row execute function public.set_updated_at();

create function public.set_newsletter_sent_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.group_id is distinct from old.group_id
    or new.started_at is distinct from old.started_at
    or new.created_by is distinct from old.created_by then
    raise exception 'Newsletter ownership and start time are immutable';
  end if;

  if old.status = 'sent' then
    if new.status <> 'sent' or new.sent_at is distinct from old.sent_at then
      raise exception 'A published newsletter cannot be reopened or re-dated';
    end if;
  elsif new.status = 'sent' then
    new.sent_at = now();
  else
    new.sent_at = null;
  end if;

  return new;
end;
$$;

create trigger newsletters_set_sent_at
  before update on public.newsletters
  for each row execute function public.set_newsletter_sent_at();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.newsletters enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;

revoke all on public.profiles, public.groups, public.group_members,
  public.newsletters, public.questions, public.responses
  from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.newsletters to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.responses to authenticated;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_owner(uuid) from public, anon;
revoke all on function public.is_group_creator(uuid) from public, anon;
revoke all on function public.can_view_profile(uuid) from public, anon;
revoke all on function public.can_access_question(uuid, boolean) from public, anon;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_newsletter_sent_at() from public, anon, authenticated;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.is_group_creator(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.can_access_question(uuid, boolean) to authenticated;

create policy "Users can view their own and group members' profiles"
  on public.profiles for select to authenticated
  using ((select public.can_view_profile(id)));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Group members can view their groups"
  on public.groups for select to authenticated
  using ((select public.is_group_member(id)));

create policy "Authenticated users can create groups"
  on public.groups for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Group owners can update their groups"
  on public.groups for update to authenticated
  using ((select public.is_group_owner(id)))
  with check (
    created_by = (select auth.uid())
    and (select public.is_group_owner(id))
  );

create policy "Group owners can delete their groups"
  on public.groups for delete to authenticated
  using ((select public.is_group_owner(id)));

create policy "Members can view group membership"
  on public.group_members for select to authenticated
  using (
    (select public.is_group_member(group_id))
    or user_id = (select auth.uid())
  );

create policy "Owners can add members and creators can add themselves"
  on public.group_members for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role = 'owner'
      and (select public.is_group_creator(group_id))
    )
    or (
      role = 'member'
      and (select public.is_group_owner(group_id))
    )
  );

create policy "Owners can remove members and members can leave"
  on public.group_members for delete to authenticated
  using (
    (select public.is_group_owner(group_id))
    or (user_id = (select auth.uid()) and role = 'member')
  );

create policy "Group members can view newsletters"
  on public.newsletters for select to authenticated
  using ((select public.is_group_member(group_id)));

create policy "Group owners can start newsletters"
  on public.newsletters for insert to authenticated
  with check (
    status = 'open'
    and sent_at is null
    and created_by = (select auth.uid())
    and (select public.is_group_owner(group_id))
  );

create policy "Group owners can publish newsletters"
  on public.newsletters for update to authenticated
  using ((select public.is_group_owner(group_id)))
  with check ((select public.is_group_owner(group_id)));

create policy "Group owners can delete open newsletters"
  on public.newsletters for delete to authenticated
  using (
    status = 'open'
    and (select public.is_group_owner(group_id))
  );

create policy "Group members can view questions"
  on public.questions for select to authenticated
  using (
    exists (
      select 1 from public.newsletters as n
      where n.id = newsletter_id
        and (select public.is_group_member(n.group_id))
    )
  );

create policy "Group members can add one question per open newsletter"
  on public.questions for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and exists (
      select 1 from public.newsletters as n
      where n.id = newsletter_id
        and n.status = 'open'
        and (select public.is_group_member(n.group_id))
    )
  );

create policy "Authors can edit their questions before publication"
  on public.questions for update to authenticated
  using (
    author_user_id = (select auth.uid())
    and exists (
      select 1 from public.newsletters as n
      where n.id = newsletter_id
        and n.status = 'open'
        and (select public.is_group_member(n.group_id))
    )
  )
  with check (
    author_user_id = (select auth.uid())
    and exists (
      select 1 from public.newsletters as n
      where n.id = newsletter_id
        and n.status = 'open'
        and (select public.is_group_member(n.group_id))
    )
  );

create policy "Authors can delete their questions before publication"
  on public.questions for delete to authenticated
  using (
    author_user_id = (select auth.uid())
    and exists (
      select 1 from public.newsletters as n
      where n.id = newsletter_id
        and n.status = 'open'
        and (select public.is_group_member(n.group_id))
    )
  );

create policy "Group members can view responses"
  on public.responses for select to authenticated
  using ((select public.can_access_question(question_id, false)));

create policy "Group members can respond to open newsletter questions"
  on public.responses for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.can_access_question(question_id, true))
  );

create policy "Users can edit their responses before publication"
  on public.responses for update to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.can_access_question(question_id, true))
  )
  with check (
    user_id = (select auth.uid())
    and (select public.can_access_question(question_id, true))
  );

create policy "Users can delete their responses before publication"
  on public.responses for delete to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.can_access_question(question_id, true))
  );
