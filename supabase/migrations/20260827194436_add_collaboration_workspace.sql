alter table public.organization_members
  add column if not exists invited_email text,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz;

update public.organization_members
set accepted_at = created_at
where accepted_at is null
  and invited_email is null;

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'editor', 'reviewer', 'viewer'));

create index if not exists organization_members_invited_email_idx
  on public.organization_members (lower(invited_email))
  where invited_email is not null;

alter table public.product_requirements
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists due_date date;

create index if not exists product_requirements_assigned_to_idx
  on public.product_requirements (assigned_to)
  where assigned_to is not null;

create index if not exists product_requirements_due_date_idx
  on public.product_requirements (org_id, due_date)
  where due_date is not null;

create table if not exists public.requirement_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_requirement_id uuid not null references public.product_requirements(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requirement_comments_requirement_created_idx
  on public.requirement_comments (product_requirement_id, created_at);

create index if not exists requirement_comments_org_product_idx
  on public.requirement_comments (org_id, product_id);

alter table public.requirement_comments enable row level security;

revoke all on table public.requirement_comments from anon;
grant select, insert, update, delete on table public.requirement_comments to authenticated;

drop policy if exists "requirement_comments_select_member" on public.requirement_comments;
create policy "requirement_comments_select_member"
on public.requirement_comments
for select
to authenticated
using (
  private.is_org_member(org_id, (select auth.uid()))
);

drop policy if exists "requirement_comments_insert_collaborator" on public.requirement_comments;
create policy "requirement_comments_insert_collaborator"
on public.requirement_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor', 'reviewer']
  )
  and exists (
    select 1
    from public.product_requirements pr
    where pr.id = requirement_comments.product_requirement_id
      and pr.org_id = requirement_comments.org_id
      and pr.product_id = requirement_comments.product_id
  )
);

drop policy if exists "requirement_comments_update_author" on public.requirement_comments;
create policy "requirement_comments_update_author"
on public.requirement_comments
for update
to authenticated
using (
  author_id = (select auth.uid())
  and private.is_org_member(org_id, (select auth.uid()))
)
with check (
  author_id = (select auth.uid())
  and private.is_org_member(org_id, (select auth.uid()))
  and exists (
    select 1
    from public.product_requirements pr
    where pr.id = requirement_comments.product_requirement_id
      and pr.org_id = requirement_comments.org_id
      and pr.product_id = requirement_comments.product_id
  )
);

drop policy if exists "requirement_comments_delete_author_or_admin" on public.requirement_comments;
create policy "requirement_comments_delete_author_or_admin"
on public.requirement_comments
for delete
to authenticated
using (
  author_id = (select auth.uid())
  or private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin']
  )
);

create or replace function private.shares_organization_with_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members mine
      join public.organization_members colleague on colleague.org_id = mine.org_id
      where mine.user_id = (select auth.uid())
        and colleague.user_id = p_profile_id
    );
$$;

revoke all on function private.shares_organization_with_profile(uuid) from public;
revoke all on function private.shares_organization_with_profile(uuid) from anon;
grant execute on function private.shares_organization_with_profile(uuid) to authenticated;

drop policy if exists "profiles_select_organization_colleague" on public.profiles;
create policy "profiles_select_organization_colleague"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_organization_with_profile(id)
);

drop policy if exists "organization_members_select_member" on public.organization_members;
drop policy if exists "org_members_select_member" on public.organization_members;
create policy "org_members_select_member"
on public.organization_members
for select
to authenticated
using (
  private.is_org_member(org_id, (select auth.uid()))
);

grant select on table public.organization_members to authenticated;
grant select on table public.profiles to authenticated;

create or replace function public.assign_product_requirement(
  p_product_requirement_id uuid,
  p_assignee_id uuid,
  p_due_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_product_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_due_date is not null and p_due_date < current_date then
    raise exception 'Due date cannot be in the past';
  end if;

  select pr.org_id, pr.product_id
  into v_org_id, v_product_id
  from public.product_requirements pr
  where pr.id = p_product_requirement_id;

  if v_org_id is null then
    raise exception 'Product requirement not found';
  end if;

  if not private.has_org_role(v_org_id, v_user_id, array['owner', 'admin', 'editor']) then
    raise exception 'Insufficient permissions';
  end if;

  if p_assignee_id is not null
    and not private.is_org_member(v_org_id, p_assignee_id) then
    raise exception 'Assignee is not a member of this organization';
  end if;

  update public.product_requirements
  set assigned_to = p_assignee_id,
      due_date = p_due_date,
      updated_at = now()
  where id = p_product_requirement_id
    and org_id = v_org_id;

  insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
  values (
    v_org_id,
    v_user_id,
    'product',
    v_product_id,
    'Responsabilité mise à jour',
    jsonb_build_object(
      'product_requirement_id', p_product_requirement_id,
      'assignee_id', p_assignee_id,
      'due_date', p_due_date
    )
  );

  return jsonb_build_object(
    'product_requirement_id', p_product_requirement_id,
    'assignee_id', p_assignee_id,
    'due_date', p_due_date
  );
end;
$$;

revoke all on function public.assign_product_requirement(uuid, uuid, date) from public;
revoke all on function public.assign_product_requirement(uuid, uuid, date) from anon;
grant execute on function public.assign_product_requirement(uuid, uuid, date) to authenticated;

create or replace function public.add_requirement_comment(
  p_product_requirement_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_product_id uuid;
  v_comment_id uuid;
  v_created_at timestamptz;
  v_body text := btrim(p_body);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'Comment must contain between 1 and 2000 characters';
  end if;

  select pr.org_id, pr.product_id
  into v_org_id, v_product_id
  from public.product_requirements pr
  where pr.id = p_product_requirement_id;

  if v_org_id is null then
    raise exception 'Product requirement not found';
  end if;

  if not private.has_org_role(v_org_id, v_user_id, array['owner', 'admin', 'editor', 'reviewer']) then
    raise exception 'Insufficient permissions';
  end if;

  insert into public.requirement_comments (
    org_id,
    product_id,
    product_requirement_id,
    author_id,
    body
  ) values (
    v_org_id,
    v_product_id,
    p_product_requirement_id,
    v_user_id,
    v_body
  )
  returning id, created_at into v_comment_id, v_created_at;

  insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
  values (
    v_org_id,
    v_user_id,
    'product',
    v_product_id,
    'Commentaire ajouté',
    jsonb_build_object(
      'product_requirement_id', p_product_requirement_id,
      'comment_id', v_comment_id
    )
  );

  return jsonb_build_object(
    'id', v_comment_id,
    'body', v_body,
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.add_requirement_comment(uuid, text) from public;
revoke all on function public.add_requirement_comment(uuid, text) from anon;
grant execute on function public.add_requirement_comment(uuid, text) to authenticated;

create or replace function public.update_organization_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_previous_role text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if p_role not in ('admin', 'editor', 'reviewer', 'viewer') then
    raise exception 'Unsupported organization role';
  end if;

  if not exists (
    select 1
    from public.organization_members actor
    where actor.org_id = p_org_id
      and actor.user_id = v_actor_id
      and actor.role in ('owner', 'admin')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  select role into v_previous_role
  from public.organization_members
  where org_id = p_org_id
    and user_id = p_user_id
  for update;

  if v_previous_role is null then
    raise exception 'Organization member not found';
  end if;

  if v_previous_role = 'owner' then
    raise exception 'The owner role cannot be changed';
  end if;

  update public.organization_members
  set role = p_role
  where org_id = p_org_id
    and user_id = p_user_id;

  insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
  values (
    p_org_id,
    v_actor_id,
    'organization',
    p_org_id,
    'Rôle d’équipe modifié',
    jsonb_build_object(
      'member_user_id', p_user_id,
      'previous_role', v_previous_role,
      'role', p_role
    )
  );

  return jsonb_build_object('user_id', p_user_id, 'role', p_role);
end;
$$;

revoke all on function public.update_organization_member_role(uuid, uuid, text) from public;
revoke all on function public.update_organization_member_role(uuid, uuid, text) from anon;
grant execute on function public.update_organization_member_role(uuid, uuid, text) to authenticated;

create or replace function public.accept_my_organization_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.organization_members
  set accepted_at = coalesce(accepted_at, now())
  where user_id = v_user_id
    and accepted_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.accept_my_organization_invitations() from public;
revoke all on function public.accept_my_organization_invitations() from anon;
grant execute on function public.accept_my_organization_invitations() to authenticated;
