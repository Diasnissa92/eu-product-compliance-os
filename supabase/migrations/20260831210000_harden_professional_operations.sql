-- Release gate hardening for public supplier portals, Safety Gate automation
-- and atomic incident creation.

create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.runtime_secrets (
  name text primary key,
  secret_sha256 bytea not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.runtime_secrets from public, anon, authenticated;

insert into private.runtime_secrets (name, secret_sha256)
values ('safety_gate_cron', decode('9cefa5bb6fb32647fe50a6b3930d991d935206b2aaef088b2c71959fd52b2bc1', 'hex'))
on conflict (name) do update set secret_sha256 = excluded.secret_sha256, updated_at = now();

create table if not exists private.safety_gate_sync_runs (
  id uuid primary key default gen_random_uuid(),
  report_reference text not null,
  report_date date not null,
  alert_count integer not null check (alert_count between 0 and 1000),
  match_count integer not null default 0 check (match_count >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  error_message text
);

revoke all on table private.safety_gate_sync_runs from public, anon, authenticated;

alter table public.safety_gate_matches drop constraint if exists safety_gate_matches_alert_url_check;
alter table public.safety_gate_matches add constraint safety_gate_matches_alert_url_check
  check (alert_url ~ '^https://ec\.europa\.eu/safety-gate-alerts/screen/webReport/alertDetail/[0-9]+$');

create unique index if not exists products_org_normalized_sku_idx
  on public.products (org_id, lower(btrim(sku))) where nullif(btrim(sku), '') is not null;

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
    and sr.status not in ('cancelled', 'expired', 'completed')
    and (sr.due_date is null or sr.due_date >= current_date)
  limit 1;
$$;

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
  response_count integer;
  response_limit integer;
begin
  select * into request_record
  from public.supplier_requests
  where access_token = p_token
    and status not in ('cancelled', 'expired', 'completed')
    and (due_date is null or due_date >= current_date)
  for update;

  if not found then raise exception 'Demande introuvable, expirée ou clôturée'; end if;
  if char_length(btrim(coalesce(p_supplier_name, ''))) not between 2 and 160 then raise exception 'Nom fournisseur invalide'; end if;
  if p_supplier_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Adresse e-mail invalide'; end if;
  if lower(btrim(p_supplier_email)) <> lower(request_record.supplier_email) then raise exception 'Cette adresse e-mail ne correspond pas à la demande'; end if;
  if char_length(btrim(coalesce(p_document_name, ''))) not between 1 and 240 then raise exception 'Nom du document invalide'; end if;
  if char_length(coalesce(p_notes, '')) > 4000 then raise exception 'Commentaire trop long'; end if;
  if p_document_url !~* '^https://[^[:space:]]+$' or char_length(p_document_url) > 2000 then raise exception 'Le lien documentaire HTTPS est invalide'; end if;

  select count(*) into response_count from public.supplier_responses where request_id = request_record.id;
  response_limit := least(20, greatest(3, cardinality(request_record.requested_items) * 3));
  if response_count >= response_limit then raise exception 'Nombre maximal de réponses atteint pour cette demande'; end if;

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

create or replace function private.create_incident_from_safety_gate_impl(p_org_id uuid, p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  match_record public.safety_gate_matches%rowtype;
  incident_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not private.has_org_role(p_org_id, actor_id, array['owner','admin','editor','reviewer']) then raise exception 'Insufficient permissions'; end if;

  select * into match_record from public.safety_gate_matches
  where id = p_match_id and org_id = p_org_id for update;
  if not found then raise exception 'Alerte Safety Gate introuvable'; end if;

  if match_record.status = 'incident_created' then
    select id into incident_id from public.product_incidents
    where org_id = p_org_id and source = 'safety_gate' and reference = match_record.alert_reference
    order by created_at desc limit 1;
    return jsonb_build_object('incidentId', incident_id, 'created', false);
  end if;

  insert into public.product_incidents (
    org_id, product_id, created_by, source, title, reference, severity,
    status, description, recall_required
  ) values (
    p_org_id, match_record.product_id, actor_id, 'safety_gate', match_record.title,
    match_record.alert_reference,
    case when match_record.risk_level = 'serious' then 'critical' else 'high' end,
    'investigating', 'Alerte Safety Gate officielle à évaluer : ' || match_record.alert_url, false
  ) returning id into incident_id;

  update public.safety_gate_matches set status = 'incident_created', updated_at = now()
  where id = match_record.id;

  insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
  values (p_org_id, actor_id, 'product_incident', incident_id, 'Incident créé depuis Safety Gate',
    jsonb_build_object('match_id', match_record.id, 'alert_reference', match_record.alert_reference));

  return jsonb_build_object('incidentId', incident_id, 'created', true);
end;
$$;

revoke all on function private.create_incident_from_safety_gate_impl(uuid, uuid) from public, anon;
grant execute on function private.create_incident_from_safety_gate_impl(uuid, uuid) to authenticated;

create or replace function public.create_incident_from_safety_gate(p_org_id uuid, p_match_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.create_incident_from_safety_gate_impl($1, $2); $$;

revoke all on function public.create_incident_from_safety_gate(uuid, uuid) from public, anon;
grant execute on function public.create_incident_from_safety_gate(uuid, uuid) to authenticated;

create or replace function private.guard_incident_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'closed' and exists (
    select 1 from public.corrective_actions
    where incident_id = new.id and status not in ('done', 'cancelled')
  ) then
    raise exception 'Toutes les actions correctives doivent être terminées ou annulées avant la clôture';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_incident_close_trigger on public.product_incidents;
create trigger guard_incident_close_trigger
before update of status on public.product_incidents
for each row execute function private.guard_incident_close();

create or replace function private.guard_closed_incident_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.product_incidents where id = new.incident_id and status = 'closed') then
    raise exception 'Une action ne peut pas être ajoutée ou rouverte sur un incident clôturé';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_closed_incident_action_trigger on public.corrective_actions;
create trigger guard_closed_incident_action_trigger
before insert or update of status, incident_id on public.corrective_actions
for each row execute function private.guard_closed_incident_action();

create or replace function private.normalize_safety_gate_text(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(regexp_replace(lower(extensions.unaccent(coalesce($1, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

revoke all on function private.normalize_safety_gate_text(text) from public, anon, authenticated;

create or replace function private.sync_safety_gate_alerts_impl(
  p_secret text,
  p_report_reference text,
  p_report_date date,
  p_alerts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_hash bytea;
  run_id uuid;
  alert_value jsonb;
  watch_record public.safety_gate_watches%rowtype;
  search_blob text;
  matched_terms text[];
  watch_count integer;
  inserted_rows integer;
  total_matches integer := 0;
  new_matches integer := 0;
  alert_total integer;
  alert_reference text;
  alert_url text;
  alert_title text;
  alert_risk text;
begin
  select secret_sha256 into expected_hash from private.runtime_secrets where name = 'safety_gate_cron';
  if expected_hash is null or extensions.digest(coalesce(p_secret, ''), 'sha256') <> expected_hash then
    raise exception 'Invalid synchronization secret';
  end if;
  if jsonb_typeof(p_alerts) <> 'array' then raise exception 'Alerts must be a JSON array'; end if;
  alert_total := jsonb_array_length(p_alerts);
  if alert_total not between 1 and 1000 then raise exception 'Alert payload outside allowed range'; end if;
  if char_length(btrim(coalesce(p_report_reference, ''))) not between 3 and 240 then raise exception 'Invalid report reference'; end if;

  insert into private.safety_gate_sync_runs (report_reference, report_date, alert_count)
  values (left(btrim(p_report_reference), 240), p_report_date, alert_total) returning id into run_id;

  for watch_record in select * from public.safety_gate_watches where enabled = true for update loop
    watch_count := 0;
    for alert_value in select value from jsonb_array_elements(p_alerts) loop
      alert_reference := left(btrim(coalesce(alert_value ->> 'reference', '')), 80);
      alert_url := left(btrim(coalesce(alert_value ->> 'url', '')), 500);
      if alert_reference = '' or alert_url !~ '^https://ec\.europa\.eu/safety-gate-alerts/screen/webReport/alertDetail/[0-9]+$' then continue; end if;

      search_blob := private.normalize_safety_gate_text(concat_ws(' ',
        alert_reference, alert_value ->> 'category', alert_value ->> 'product', alert_value ->> 'brand',
        alert_value ->> 'model', alert_value ->> 'batch', alert_value ->> 'barcode',
        alert_value ->> 'riskType', alert_value ->> 'notifyingCountry', alert_value ->> 'countryOfOrigin',
        alert_value ->> 'description', alert_value ->> 'danger'));

      select coalesce(array_agg(keyword order by keyword), '{}'::text[]) into matched_terms
      from unnest(watch_record.keywords) keyword
      where char_length(private.normalize_safety_gate_text(keyword)) >= 3
        and position(private.normalize_safety_gate_text(keyword) in search_blob) > 0;

      if cardinality(matched_terms) > 0 then
        watch_count := watch_count + 1;
        total_matches := total_matches + 1;
        alert_title := left(coalesce(nullif(concat_ws(' · ',
          nullif(btrim(alert_value ->> 'product'), ''), nullif(btrim(alert_value ->> 'brand'), ''),
          nullif(btrim(alert_value ->> 'model'), '')), ''), alert_reference), 500);
        alert_risk := case when lower(coalesce(alert_value ->> 'riskLevel', '')) like '%serious%' then 'serious' else 'medium' end;

        insert into public.safety_gate_matches (
          org_id, watch_id, product_id, created_by, alert_reference, title,
          product_category, notifying_country, risk_level, alert_url, matched_terms, status
        ) values (
          watch_record.org_id, watch_record.id, watch_record.product_id, watch_record.created_by,
          alert_reference, alert_title, nullif(left(alert_value ->> 'category', 240), ''),
          nullif(left(alert_value ->> 'notifyingCountry', 160), ''), alert_risk,
          alert_url, matched_terms, 'new'
        ) on conflict do nothing;
        get diagnostics inserted_rows = row_count;
        new_matches := new_matches + inserted_rows;
      end if;
    end loop;

    update public.safety_gate_watches
    set last_checked_at = now(), last_result_count = watch_count, updated_at = now()
    where id = watch_record.id;
  end loop;

  update private.safety_gate_sync_runs
  set status = 'completed', match_count = new_matches, completed_at = now()
  where id = run_id;

  return jsonb_build_object(
    'alertsProcessed', alert_total,
    'matchesDetected', total_matches,
    'newMatches', new_matches,
    'completedAt', now()
  );
exception when others then
  if run_id is not null then
    update private.safety_gate_sync_runs
    set status = 'failed', completed_at = now(), error_message = left(sqlerrm, 1000)
    where id = run_id;
  end if;
  raise;
end;
$$;

revoke all on function private.sync_safety_gate_alerts_impl(text, text, date, jsonb) from public;
grant execute on function private.sync_safety_gate_alerts_impl(text, text, date, jsonb) to anon, authenticated;

create or replace function public.sync_safety_gate_alerts(
  p_secret text,
  p_report_reference text,
  p_report_date date,
  p_alerts jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.sync_safety_gate_alerts_impl($1, $2, $3, $4); $$;

revoke all on function public.sync_safety_gate_alerts(text, text, date, jsonb) from public;
grant execute on function public.sync_safety_gate_alerts(text, text, date, jsonb) to anon, authenticated;

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
  name_value text;
  sku_value text;
  category_value text;
  manufacturer_value text;
  origin_value text;
  markets_value text[];
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if not private.has_org_role(p_org_id, actor_id, array['owner','admin','editor']) then raise exception 'Insufficient permissions'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'Import limité à 1–100 lignes'; end if;

  for row_data in select value from jsonb_array_elements(p_rows) loop
    row_number := row_number + 1;
    begin
      if jsonb_typeof(row_data) <> 'object' then raise exception 'Format de ligne invalide'; end if;
      name_value := btrim(coalesce(row_data ->> 'name', ''));
      sku_value := btrim(coalesce(row_data ->> 'sku', ''));
      category_value := btrim(coalesce(row_data ->> 'category', ''));
      manufacturer_value := btrim(coalesce(row_data ->> 'manufacturer', ''));
      origin_value := btrim(coalesce(row_data ->> 'originCountry', ''));
      if char_length(name_value) not between 1 and 240 or char_length(sku_value) not between 1 and 240 then raise exception 'Nom ou SKU invalide'; end if;
      if greatest(char_length(category_value), char_length(manufacturer_value), char_length(origin_value)) > 240 then raise exception 'Une valeur dépasse 240 caractères'; end if;
      if jsonb_typeof(row_data -> 'targetMarkets') not in ('array', 'null') then raise exception 'Marchés cibles invalides'; end if;
      if jsonb_typeof(row_data -> 'targetMarkets') = 'array' and jsonb_array_length(row_data -> 'targetMarkets') > 30 then raise exception 'Maximum 30 marchés cibles'; end if;
      if exists (select 1 from jsonb_array_elements_text(coalesce(row_data -> 'targetMarkets', '[]'::jsonb)) value where char_length(btrim(value)) not between 1 and 120) then raise exception 'Nom de marché invalide'; end if;
      markets_value := array(select btrim(value) from jsonb_array_elements_text(coalesce(row_data -> 'targetMarkets', '[]'::jsonb)) value);

      sector_value := case when lower(category_value) like '%construction%' then 'construction' else 'consumer' end;
      insert into public.products (
        org_id, created_by, name, sku, category, sector, manufacturer_name,
        origin_country, target_markets, status, risk_level
      ) values (
        p_org_id, actor_id, name_value, sku_value, nullif(category_value, ''), sector_value,
        nullif(manufacturer_value, ''), nullif(origin_value, ''), markets_value, 'draft', 'unknown'
      ) returning id into product_id;

      insert into public.product_requirements (org_id, product_id, requirement_id, status)
      select p_org_id, product_id, r.id, 'pending' from public.requirements r
      where r.sector in ('cross-sector', sector_value);
      created_count := created_count + 1;
    exception
      when unique_violation then
        skipped_count := skipped_count + 1;
        errors_value := errors_value || jsonb_build_array(jsonb_build_object('row', row_number, 'sku', sku_value, 'message', 'SKU déjà existant'));
      when others then
        skipped_count := skipped_count + 1;
        errors_value := errors_value || jsonb_build_array(jsonb_build_object('row', row_number, 'sku', sku_value, 'message', sqlerrm));
    end;
  end loop;

  insert into public.product_imports (org_id, created_by, file_name, total_rows, created_rows, skipped_rows, errors)
  values (p_org_id, actor_id, left(coalesce(nullif(btrim(p_file_name), ''), 'import.csv'), 240), jsonb_array_length(p_rows), created_count, skipped_count, errors_value);

  insert into public.audit_events (org_id, user_id, entity_type, action, payload)
  values (p_org_id, actor_id, 'product_import', 'Import produits terminé',
    jsonb_build_object('file_name', left(p_file_name, 240), 'created', created_count, 'skipped', skipped_count));

  return jsonb_build_object('created', created_count, 'skipped', skipped_count, 'errors', errors_value);
end;
$$;

notify pgrst, 'reload schema';
