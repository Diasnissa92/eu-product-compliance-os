-- Phase 2: real SaaS foundations, atomic onboarding, billing state and auditable regulatory assessments.

alter table public.organizations
  add column if not exists legal_name text,
  add column if not exists billing_email text,
  add column if not exists vat_number text;

alter table public.organizations
  drop constraint if exists organizations_legal_name_length_check,
  add constraint organizations_legal_name_length_check
    check (legal_name is null or char_length(btrim(legal_name)) between 2 and 240),
  drop constraint if exists organizations_billing_email_length_check,
  add constraint organizations_billing_email_length_check
    check (billing_email is null or (char_length(btrim(billing_email)) between 3 and 320 and billing_email = btrim(billing_email) and billing_email !~ '[[:space:]]')),
  drop constraint if exists organizations_vat_number_length_check,
  add constraint organizations_vat_number_length_check
    check (vat_number is null or char_length(btrim(vat_number)) between 2 and 40);

create table if not exists public.organization_subscriptions (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  plan_code text not null default 'free',
  status text not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_subscriptions_plan_code_check
    check (plan_code in ('free', 'starter', 'pro', 'business', 'enterprise')),
  constraint organization_subscriptions_status_check
    check (status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  constraint organization_subscriptions_stripe_customer_check
    check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  constraint organization_subscriptions_stripe_subscription_check
    check (stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  constraint organization_subscriptions_stripe_price_check
    check (stripe_price_id is null or stripe_price_id ~ '^price_[A-Za-z0-9]+$')
);

create index if not exists organization_subscriptions_status_idx
  on public.organization_subscriptions (status, current_period_end);

alter table public.organization_subscriptions enable row level security;
revoke all on table public.organization_subscriptions from anon;
revoke insert, update, delete on table public.organization_subscriptions from authenticated;
grant select on table public.organization_subscriptions to authenticated;

drop policy if exists "organization_subscriptions_select_member" on public.organization_subscriptions;
create policy "organization_subscriptions_select_member"
on public.organization_subscriptions
for select
to authenticated
using (private.is_org_member(org_id, (select auth.uid())));

create or replace function private.ensure_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_subscriptions (org_id)
  values (new.id)
  on conflict (org_id) do nothing;
  return new;
end;
$$;

revoke all on function private.ensure_organization_subscription() from public;
revoke all on function private.ensure_organization_subscription() from anon;
revoke all on function private.ensure_organization_subscription() from authenticated;

drop trigger if exists organizations_add_subscription on public.organizations;
create trigger organizations_add_subscription
after insert on public.organizations
for each row execute function private.ensure_organization_subscription();

insert into public.organization_subscriptions (org_id)
select id from public.organizations
on conflict (org_id) do nothing;

create or replace function private.onboard_my_organization_impl(
  p_full_name text,
  p_organization_name text,
  p_slug text,
  p_country_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_full_name text := btrim(coalesce(p_full_name, ''));
  v_name text := btrim(coalesce(p_organization_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_country text := upper(btrim(coalesce(p_country_code, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(v_full_name) not between 2 and 160 then
    raise exception 'Full name must contain between 2 and 160 characters';
  end if;
  if char_length(v_name) not between 2 and 240 then
    raise exception 'Organization name must contain between 2 and 240 characters';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$' then
    raise exception 'Invalid organization slug';
  end if;
  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;
  if exists (select 1 from public.organization_members where user_id = v_user_id and accepted_at is not null) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into public.profiles (id, full_name, job_title)
  values (v_user_id, v_full_name, 'Administrateur')
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = now();

  insert into public.organizations (name, legal_name, slug, country_code, created_by)
  values (v_name, v_name, v_slug, v_country, v_user_id)
  returning id into v_org_id;

  insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
  values (v_org_id, v_user_id, 'organization', v_org_id, 'Organisation créée', jsonb_build_object('country_code', v_country));

  return jsonb_build_object('organization_id', v_org_id, 'name', v_name, 'country_code', v_country);
end;
$$;

revoke all on function private.onboard_my_organization_impl(text, text, text, text) from public;
revoke all on function private.onboard_my_organization_impl(text, text, text, text) from anon;
grant execute on function private.onboard_my_organization_impl(text, text, text, text) to authenticated;

create or replace function public.onboard_my_organization(
  p_full_name text,
  p_organization_name text,
  p_slug text,
  p_country_code text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.onboard_my_organization_impl($1, $2, $3, $4);
$$;

revoke all on function public.onboard_my_organization(text, text, text, text) from public;
revoke all on function public.onboard_my_organization(text, text, text, text) from anon;
grant execute on function public.onboard_my_organization(text, text, text, text) to authenticated;

alter table public.products
  add column if not exists regulatory_profile jsonb not null default '{}'::jsonb;

alter table public.products
  drop constraint if exists products_regulatory_profile_check,
  add constraint products_regulatory_profile_check
    check (jsonb_typeof(regulatory_profile) = 'object' and pg_column_size(regulatory_profile) <= 32768);

create table if not exists public.product_regulatory_assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  regulation_code text not null,
  outcome text not null,
  rationale text not null,
  engine_version text not null,
  inputs jsonb not null default '{}'::jsonb,
  source_url text not null,
  source_reference text,
  assessed_by uuid references public.profiles(id) on delete set null,
  assessed_at timestamptz not null default now(),
  constraint product_regulatory_assessments_outcome_check
    check (outcome in ('applicable', 'not_applicable', 'needs_information', 'human_review')),
  constraint product_regulatory_assessments_code_check
    check (char_length(regulation_code) between 2 and 80),
  constraint product_regulatory_assessments_rationale_check
    check (char_length(rationale) between 3 and 4000),
  constraint product_regulatory_assessments_engine_check
    check (char_length(engine_version) between 1 and 80),
  constraint product_regulatory_assessments_inputs_check
    check (jsonb_typeof(inputs) = 'object' and pg_column_size(inputs) <= 32768),
  constraint product_regulatory_assessments_source_url_check
    check (source_url ~ '^https://eur-lex\\.europa\\.eu/' or source_url ~ '^https://ec\\.europa\\.eu/' or source_url ~ '^https://commission\\.europa\\.eu/')
);

create unique index if not exists product_regulatory_assessments_latest_key
  on public.product_regulatory_assessments (product_id, regulation_code, engine_version);
create index if not exists product_regulatory_assessments_org_product_idx
  on public.product_regulatory_assessments (org_id, product_id, assessed_at desc);
create index if not exists product_regulatory_assessments_assessed_by_idx
  on public.product_regulatory_assessments (assessed_by)
  where assessed_by is not null;

alter table public.product_regulatory_assessments enable row level security;
revoke all on table public.product_regulatory_assessments from anon;
grant select, insert, update, delete on table public.product_regulatory_assessments to authenticated;

drop policy if exists "product_regulatory_assessments_select_member" on public.product_regulatory_assessments;
create policy "product_regulatory_assessments_select_member"
on public.product_regulatory_assessments for select to authenticated
using (private.is_org_member(org_id, (select auth.uid())));

drop policy if exists "product_regulatory_assessments_insert_collaborator" on public.product_regulatory_assessments;
create policy "product_regulatory_assessments_insert_collaborator"
on public.product_regulatory_assessments for insert to authenticated
with check (
  private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (select 1 from public.products p where p.id = product_id and p.org_id = org_id)
  and (assessed_by is null or assessed_by = (select auth.uid()))
);

drop policy if exists "product_regulatory_assessments_update_collaborator" on public.product_regulatory_assessments;
create policy "product_regulatory_assessments_update_collaborator"
on public.product_regulatory_assessments for update to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']))
with check (
  private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (select 1 from public.products p where p.id = product_id and p.org_id = org_id)
  and (assessed_by is null or assessed_by = (select auth.uid()))
);

drop policy if exists "product_regulatory_assessments_delete_admin" on public.product_regulatory_assessments;
create policy "product_regulatory_assessments_delete_admin"
on public.product_regulatory_assessments for delete to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin']));
