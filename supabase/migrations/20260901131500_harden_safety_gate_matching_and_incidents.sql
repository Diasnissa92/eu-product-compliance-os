-- Avoid substring false positives and make Safety Gate -> incident conversion idempotent.

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
  created_flag boolean := false;
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
    case when match_record.risk_level = 'serious' then 'critical' when match_record.risk_level = 'high' then 'high' else 'medium' end,
    'investigating', 'Alerte Safety Gate officielle à évaluer : ' || match_record.alert_url, false
  )
  on conflict (org_id, reference) where source = 'safety_gate' and reference is not null do nothing
  returning id into incident_id;

  created_flag := incident_id is not null;
  if incident_id is null then
    select id into incident_id from public.product_incidents
    where org_id = p_org_id and source = 'safety_gate' and reference = match_record.alert_reference
    order by created_at desc limit 1;
  end if;
  if incident_id is null then raise exception 'Incident Safety Gate introuvable après déduplication'; end if;

  update public.safety_gate_matches set status = 'incident_created', updated_at = now()
  where id = match_record.id;

  insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
  values (p_org_id, actor_id, 'product_incident', incident_id,
    case when created_flag then 'Incident créé depuis Safety Gate' else 'Correspondance Safety Gate rattachée à un incident existant' end,
    jsonb_build_object('match_id', match_record.id, 'alert_reference', match_record.alert_reference));

  return jsonb_build_object('incidentId', incident_id, 'created', created_flag);
end;
$$;

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
      where char_length(private.normalize_safety_gate_text(keyword)) between 3 and 120
        and position(' ' || private.normalize_safety_gate_text(keyword) || ' ' in ' ' || search_blob || ' ') > 0;

      if cardinality(matched_terms) > 0 then
        watch_count := watch_count + 1;
        total_matches := total_matches + 1;
        alert_title := left(coalesce(nullif(concat_ws(' · ',
          nullif(btrim(alert_value ->> 'product'), ''), nullif(btrim(alert_value ->> 'brand'), ''),
          nullif(btrim(alert_value ->> 'model'), '')), ''), alert_reference), 500);
        alert_risk := case
          when lower(coalesce(alert_value ->> 'riskLevel', '')) like '%serious%' then 'serious'
          when lower(coalesce(alert_value ->> 'riskLevel', '')) like '%high%' then 'high'
          else 'medium'
        end;

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

  return jsonb_build_object('alertsProcessed', alert_total, 'matchesDetected', total_matches, 'newMatches', new_matches, 'completedAt', now());
exception when others then
  if run_id is not null then
    update private.safety_gate_sync_runs
    set status = 'failed', completed_at = now(), error_message = left(sqlerrm, 1000)
    where id = run_id;
  end if;
  raise;
end;
$$;
