create index if not exists organization_members_invited_by_idx
  on public.organization_members (invited_by)
  where invited_by is not null;

create unique index if not exists organization_members_org_invited_email_key
  on public.organization_members (org_id, lower(invited_email))
  where invited_email is not null;

create index if not exists requirement_comments_author_idx
  on public.requirement_comments (author_id);

create index if not exists requirement_comments_product_idx
  on public.requirement_comments (product_id);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_organization_colleague" on public.profiles;
drop policy if exists "profiles_select_member" on public.profiles;
create policy "profiles_select_member"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_organization_with_profile(id)
);

create or replace function private.update_organization_member_role_impl(
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

revoke all on function private.update_organization_member_role_impl(uuid, uuid, text) from public;
revoke all on function private.update_organization_member_role_impl(uuid, uuid, text) from anon;
grant execute on function private.update_organization_member_role_impl(uuid, uuid, text) to authenticated;

create or replace function public.update_organization_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_organization_member_role_impl($1, $2, $3);
$$;

revoke all on function public.update_organization_member_role(uuid, uuid, text) from public;
revoke all on function public.update_organization_member_role(uuid, uuid, text) from anon;
grant execute on function public.update_organization_member_role(uuid, uuid, text) to authenticated;

create or replace function private.accept_my_organization_invitations_impl()
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

revoke all on function private.accept_my_organization_invitations_impl() from public;
revoke all on function private.accept_my_organization_invitations_impl() from anon;
grant execute on function private.accept_my_organization_invitations_impl() to authenticated;

create or replace function public.accept_my_organization_invitations()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.accept_my_organization_invitations_impl();
$$;

revoke all on function public.accept_my_organization_invitations() from public;
revoke all on function public.accept_my_organization_invitations() from anon;
grant execute on function public.accept_my_organization_invitations() to authenticated;
