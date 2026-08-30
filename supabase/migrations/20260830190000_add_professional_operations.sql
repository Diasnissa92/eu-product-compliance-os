-- Professional operations: suppliers, ecommerce audits, DPP, Safety Gate,
-- batch imports and incident / recall management.

alter table public.products
  add column if not exists dpp_public_data jsonb not null default '{}'::jsonb,
  add column if not exists dpp_published_at timestamptz,
  add column if not exists dpp_updated_at timestamptz;

create table public.supplier_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_requirement_id uuid references public.product_requirements(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  supplier_name text not null check (char_length(btrim(supplier_name)) between 2 and 160),
  supplier_email text not null check (supplier_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  subject text not null check (char_length(btrim(subject)) between 3 and 200),
  requested_items text[] not null default '{}',
  message text,
  due_date date,
  status text not null default 'sent'
    check (status in ('draft', 'sent', 'viewed', 'received', 'completed', 'expired', 'cancelled')),
  access_token uuid not null default gen_random_uuid() unique,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supplier_requests(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_name text not null check (char_length(btrim(supplier_name)) between 2 and 160),
  supplier_email text not null check (supplier_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  document_url text not null check (document_url ~* '^https://'),
  document_name text not null check (char_length(btrim(document_name)) between 1 and 240),
  notes text check (notes is null or char_length(notes) <= 4000),
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create table public.ecommerce_audits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  marketplace text not null default 'Autre',
  listing_url text check (listing_url is null or listing_url ~* '^https://'),
  listing_data jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  score integer not null check (score between 0 and 100),
  status text not null default 'review'
    check (status in ('compliant', 'review', 'blocking')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safety_gate_watches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  label text not null check (char_length(btrim(label)) between 2 and 160),
  keywords text[] not null check (cardinality(keywords) between 1 and 20),
  category text,
  enabled boolean not null default true,
  last_checked_at timestamptz,
  last_result_count integer not null default 0 check (last_result_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safety_gate_matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  watch_id uuid references public.safety_gate_watches(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  alert_reference text not null,
  title text not null,
  product_category text,
  notifying_country text,
  risk_level text not null default 'serious',
  alert_url text not null check (alert_url ~* '^https://ec\.europa\.eu/'),
  matched_terms text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'dismissed', 'incident_created')),
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  source text not null default 'internal'
    check (source in ('internal', 'customer', 'authority', 'safety_gate', 'supplier')),
  title text not null check (char_length(btrim(title)) between 3 and 240),
  reference text,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'action_required', 'recall', 'closed')),
  description text not null check (char_length(btrim(description)) between 3 and 6000),
  countries text[] not null default '{}',
  affected_units integer check (affected_units is null or affected_units >= 0),
  recall_required boolean not null default false,
  occurred_at date,
  detected_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.product_incidents(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  owner_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 240),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  total_rows integer not null check (total_rows between 1 and 100),
  created_rows integer not null default 0 check (created_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index supplier_requests_org_status_due_idx on public.supplier_requests (org_id, status, due_date);
create index supplier_requests_product_created_idx on public.supplier_requests (product_id, created_at desc);
create index supplier_responses_request_submitted_idx on public.supplier_responses (request_id, submitted_at desc);
create index supplier_responses_org_product_idx on public.supplier_responses (org_id, product_id);
create index ecommerce_audits_org_product_created_idx on public.ecommerce_audits (org_id, product_id, created_at desc);
create index safety_gate_watches_org_enabled_idx on public.safety_gate_watches (org_id, enabled);
create index safety_gate_matches_org_status_detected_idx on public.safety_gate_matches (org_id, status, detected_at desc);
create unique index safety_gate_matches_unique_alert_product_idx
  on public.safety_gate_matches (org_id, alert_reference, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index product_incidents_org_status_detected_idx on public.product_incidents (org_id, status, detected_at desc);
create index product_incidents_product_idx on public.product_incidents (product_id);
create index corrective_actions_incident_status_idx on public.corrective_actions (incident_id, status, due_date);
create index corrective_actions_org_owner_idx on public.corrective_actions (org_id, owner_id);
create index product_imports_org_created_idx on public.product_imports (org_id, created_at desc);
create unique index products_org_dpp_identifier_idx on public.products (org_id, dpp_identifier) where dpp_identifier is not null;
create unique index products_public_dpp_identifier_idx on public.products (dpp_identifier) where dpp_identifier is not null and dpp_status = 'published';
create unique index if not exists products_id_org_key on public.products (id, org_id);
create unique index supplier_requests_id_org_product_key on public.supplier_requests (id, org_id, product_id);
create unique index safety_gate_watches_id_org_key on public.safety_gate_watches (id, org_id);
create unique index product_incidents_id_org_key on public.product_incidents (id, org_id);

alter table public.supplier_requests
  add constraint supplier_requests_product_scope_fkey
  foreign key (product_id, org_id) references public.products (id, org_id) on delete cascade;
alter table public.supplier_responses
  add constraint supplier_responses_request_scope_fkey
  foreign key (request_id, org_id, product_id)
  references public.supplier_requests (id, org_id, product_id) on delete cascade,
  add constraint supplier_responses_product_scope_fkey
  foreign key (product_id, org_id) references public.products (id, org_id) on delete cascade;
alter table public.ecommerce_audits
  add constraint ecommerce_audits_product_scope_fkey
  foreign key (product_id, org_id) references public.products (id, org_id) on delete cascade;
alter table public.safety_gate_watches
  add constraint safety_gate_watches_product_scope_fkey
  foreign key (product_id, org_id) references public.products (id, org_id) on delete cascade;
alter table public.safety_gate_matches
  add constraint safety_gate_matches_watch_scope_fkey
  foreign key (watch_id, org_id) references public.safety_gate_watches (id, org_id) on delete set null (watch_id),
  add constraint safety_gate_matches_product_scope_fkey
  foreign key (product_id, org_id) references public.products (id, org_id) on delete set null (product_id);
alter table public.product_incidents
  add constraint product_incidents_product_scope_fkey
  foreign key (product_id, org_id) references public.products (id, org_id) on delete set null (product_id);
alter table public.corrective_actions
  add constraint corrective_actions_incident_scope_fkey
  foreign key (incident_id, org_id) references public.product_incidents (id, org_id) on delete cascade;

alter table public.supplier_requests enable row level security;
alter table public.supplier_responses enable row level security;
alter table public.ecommerce_audits enable row level security;
alter table public.safety_gate_watches enable row level security;
alter table public.safety_gate_matches enable row level security;
alter table public.product_incidents enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.product_imports enable row level security;

revoke all on table public.supplier_requests, public.supplier_responses, public.ecommerce_audits,
  public.safety_gate_watches, public.safety_gate_matches, public.product_incidents,
  public.corrective_actions, public.product_imports from anon;
grant select, insert, update, delete on table public.supplier_requests, public.supplier_responses,
  public.ecommerce_audits, public.safety_gate_watches, public.safety_gate_matches,
  public.product_incidents, public.corrective_actions to authenticated;
grant select, insert on table public.product_imports to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'supplier_requests', 'supplier_responses', 'ecommerce_audits', 'safety_gate_watches',
    'safety_gate_matches', 'product_incidents', 'corrective_actions', 'product_imports'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(org_id, (select auth.uid())))', table_name || '_select_member', table_name);
  end loop;
end $$;

create policy "supplier_requests_insert_collaborator" on public.supplier_requests
for insert to authenticated with check (
  created_by = (select auth.uid())
  and private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (
    select 1 from public.products p
    where p.id = supplier_requests.product_id and p.org_id = supplier_requests.org_id
  )
);
create policy "supplier_requests_update_collaborator" on public.supplier_requests
for update to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']))
with check (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']));
create policy "supplier_requests_delete_admin" on public.supplier_requests
for delete to authenticated using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin']));

create policy "supplier_responses_update_collaborator" on public.supplier_responses
for update to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']))
with check (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']));
create policy "supplier_responses_delete_admin" on public.supplier_responses
for delete to authenticated using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin']));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ecommerce_audits', 'safety_gate_watches', 'safety_gate_matches',
    'product_incidents', 'corrective_actions'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (created_by = (select auth.uid()) and private.has_org_role(org_id, (select auth.uid()), array[''owner'',''admin'',''editor'',''reviewer'']))', table_name || '_insert_collaborator', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_org_role(org_id, (select auth.uid()), array[''owner'',''admin'',''editor'',''reviewer''])) with check (private.has_org_role(org_id, (select auth.uid()), array[''owner'',''admin'',''editor'',''reviewer'']))', table_name || '_update_collaborator', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_org_role(org_id, (select auth.uid()), array[''owner'',''admin'']))', table_name || '_delete_admin', table_name);
  end loop;
end $$;

create policy "product_imports_insert_collaborator" on public.product_imports
for insert to authenticated with check (
  created_by = (select auth.uid())
  and private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor'])
);

create or replace function private.get_supplier_request_portal_impl(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'requestId', sr.id,
    'supplierName', sr.supplier_name,
    'supplierEmail', sr.supplier_email,
    'subject', sr.subject,
    'requestedItems', sr.requested_items,
    'message', sr.message,
    'dueDate', sr.due_date,
    'status', sr.status,
    'productName', p.name,
    'productSku', p.sku,
    'organizationName', o.name
  )
  from public.supplier_requests sr
  join public.products p on p.id = sr.product_id and p.org_id = sr.org_id
  join public.organizations o on o.id = sr.org_id
  where sr.access_token = p_token
    and sr.status not in ('cancelled', 'expired')
    and (sr.due_date is null or sr.due_date >= current_date - 30)
  limit 1;
$$;

revoke all on function private.get_supplier_request_portal_impl(uuid) from public;
grant execute on function private.get_supplier_request_portal_impl(uuid) to anon, authenticated;

create or replace function public.get_supplier_request_portal(p_token uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_supplier_request_portal_impl($1); $$;

revoke all on function public.get_supplier_request_portal(uuid) from public;
grant execute on function public.get_supplier_request_portal(uuid) to anon, authenticated;

create or replace function private.submit_supplier_response_impl(
  p_token uuid,
  p_supplier_name text,
  p_supplier_email text,
  p_document_name text,
  p_document_url text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.supplier_requests%rowtype;
  response_id uuid;
begin
  select * into request_record
  from public.supplier_requests
  where access_token = p_token
    and status not in ('cancelled', 'expired', 'completed')
  for update;

  if not found then raise exception 'Demande introuvable ou clôturée'; end if;
  if btrim(p_supplier_name) = '' then raise exception 'Nom fournisseur requis'; end if;
  if p_supplier_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Adresse e-mail invalide'; end if;
  if p_document_url !~* '^https://' then raise exception 'Le lien documentaire doit utiliser HTTPS'; end if;

  insert into public.supplier_responses (
    request_id, org_id, product_id, supplier_name, supplier_email,
    document_name, document_url, notes
  ) values (
    request_record.id, request_record.org_id, request_record.product_id,
    btrim(p_supplier_name), lower(btrim(p_supplier_email)), btrim(p_document_name),
    btrim(p_document_url), nullif(btrim(p_notes), '')
  ) returning id into response_id;

  update public.supplier_requests
  set status = 'received', submitted_at = now(), updated_at = now()
  where id = request_record.id;

  insert into public.audit_events (org_id, entity_type, entity_id, action, payload)
  values (request_record.org_id, 'supplier_request', request_record.id, 'Réponse fournisseur reçue',
    jsonb_build_object('response_id', response_id, 'product_id', request_record.product_id));

  return jsonb_build_object('responseId', response_id, 'status', 'received');
end;
$$;

revoke all on function private.submit_supplier_response_impl(uuid, text, text, text, text, text) from public;
grant execute on function private.submit_supplier_response_impl(uuid, text, text, text, text, text) to anon, authenticated;

create or replace function public.submit_supplier_response(
  p_token uuid,
  p_supplier_name text,
  p_supplier_email text,
  p_document_name text,
  p_document_url text,
  p_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.submit_supplier_response_impl($1, $2, $3, $4, $5, $6); $$;

revoke all on function public.submit_supplier_response(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_supplier_response(uuid, text, text, text, text, text) to anon, authenticated;

create or replace function private.get_public_product_passport_impl(p_identifier text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'identifier', p.dpp_identifier,
    'name', p.name,
    'sku', p.sku,
    'category', p.category,
    'manufacturer', p.manufacturer_name,
    'originCountry', p.origin_country,
    'targetMarkets', p.target_markets,
    'complianceScore', p.compliance_score,
    'status', p.status,
    'publicData', p.dpp_public_data,
    'publishedAt', p.dpp_published_at,
    'updatedAt', coalesce(p.dpp_updated_at, p.updated_at)
  )
  from public.products p
  where p.dpp_identifier = btrim(p_identifier)
    and p.dpp_status = 'published'
  limit 1;
$$;

revoke all on function private.get_public_product_passport_impl(text) from public;
grant execute on function private.get_public_product_passport_impl(text) to anon, authenticated;

create or replace function public.get_public_product_passport(p_identifier text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_public_product_passport_impl($1); $$;

revoke all on function public.get_public_product_passport(text) from public;
grant execute on function public.get_public_product_passport(text) to anon, authenticated;

create or replace function private.import_products_impl(p_org_id uuid, p_file_name text, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  row_data jsonb;
  product_id uuid;
  sector_value text;
  created_count integer := 0;
  skipped_count integer := 0;
  errors_value jsonb := '[]'::jsonb;
  row_number integer := 0;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not private.has_org_role(p_org_id, actor_id, array['owner','admin','editor']) then raise exception 'Insufficient permissions'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 100 then
    raise exception 'Import limité à 1–100 lignes';
  end if;

  for row_data in select value from jsonb_array_elements(p_rows) loop
    row_number := row_number + 1;
    begin
      if nullif(btrim(row_data ->> 'name'), '') is null or nullif(btrim(row_data ->> 'sku'), '') is null then
        raise exception 'Nom et SKU requis';
      end if;
      if exists (select 1 from public.products where org_id = p_org_id and lower(sku) = lower(btrim(row_data ->> 'sku'))) then
        skipped_count := skipped_count + 1;
        errors_value := errors_value || jsonb_build_array(jsonb_build_object('row', row_number, 'sku', row_data ->> 'sku', 'message', 'SKU déjà existant'));
        continue;
      end if;

      sector_value := case when lower(coalesce(row_data ->> 'category', '')) like '%construction%' then 'construction' else 'consumer' end;
      insert into public.products (
        org_id, created_by, name, sku, category, sector, manufacturer_name,
        origin_country, target_markets, status, risk_level
      ) values (
        p_org_id, actor_id, btrim(row_data ->> 'name'), btrim(row_data ->> 'sku'),
        nullif(btrim(row_data ->> 'category'), ''), sector_value,
        nullif(btrim(row_data ->> 'manufacturer'), ''), nullif(btrim(row_data ->> 'originCountry'), ''),
        case when jsonb_typeof(row_data -> 'targetMarkets') = 'array'
          then array(select jsonb_array_elements_text(row_data -> 'targetMarkets')) else '{}'::text[] end,
        'draft', 'unknown'
      ) returning id into product_id;

      insert into public.product_requirements (org_id, product_id, requirement_id, status)
      select p_org_id, product_id, r.id, 'pending'
      from public.requirements r
      where r.sector in ('cross-sector', sector_value);

      created_count := created_count + 1;
    exception when others then
      skipped_count := skipped_count + 1;
      errors_value := errors_value || jsonb_build_array(jsonb_build_object('row', row_number, 'sku', row_data ->> 'sku', 'message', sqlerrm));
    end;
  end loop;

  insert into public.product_imports (org_id, created_by, file_name, total_rows, created_rows, skipped_rows, errors)
  values (p_org_id, actor_id, left(coalesce(nullif(btrim(p_file_name), ''), 'import.csv'), 240), jsonb_array_length(p_rows), created_count, skipped_count, errors_value);

  insert into public.audit_events (org_id, user_id, entity_type, action, payload)
  values (p_org_id, actor_id, 'product_import', 'Import produits terminé',
    jsonb_build_object('file_name', p_file_name, 'created', created_count, 'skipped', skipped_count));

  return jsonb_build_object('created', created_count, 'skipped', skipped_count, 'errors', errors_value);
end;
$$;

revoke all on function private.import_products_impl(uuid, text, jsonb) from public, anon;
grant execute on function private.import_products_impl(uuid, text, jsonb) to authenticated;

create or replace function public.import_products(p_org_id uuid, p_file_name text, p_rows jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.import_products_impl($1, $2, $3); $$;

revoke all on function public.import_products(uuid, text, jsonb) from public, anon;
grant execute on function public.import_products(uuid, text, jsonb) to authenticated;
