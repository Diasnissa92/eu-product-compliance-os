-- Regulatory catalogue entries may describe a legal framework without yet being
-- operationally applicable. Never create checklist obligations from pending rules.

alter table public.requirements
  add column if not exists applicability_status text not null default 'active';

alter table public.requirements
  drop constraint if exists requirements_applicability_status_check,
  add constraint requirements_applicability_status_check
    check (applicability_status in ('active', 'pending_delegated_act', 'draft', 'retired'));

create index if not exists requirements_active_scope_idx
  on public.requirements (sector, effective_from, effective_to)
  where applicability_status = 'active';

-- Regulation (EU) 2024/3110 Article 75 requires a delegated act to establish the
-- construction DPP system. Article 80 makes the relevant obligations applicable
-- only after that delegated act. These catalogue rows remain as legal references,
-- but must not be emitted as current automatic obligations until the trigger exists.
update public.requirements q
set applicability_status = 'pending_delegated_act',
    updated_at = now()
from public.regulations r
where q.regulation_id = r.id
  and r.code = 'EU-2024-3110'
  and q.code like 'CPR-DPP-%';

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
  requirement_count integer;
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
      sector_value := lower(btrim(coalesce(row_data ->> 'sector', '')));
      if char_length(name_value) not between 1 and 240 or char_length(sku_value) not between 1 and 240 then raise exception 'Nom ou SKU invalide'; end if;
      if greatest(char_length(category_value), char_length(manufacturer_value), char_length(origin_value)) > 240 then raise exception 'Une valeur dépasse 240 caractères'; end if;
      if sector_value not in ('construction','consumer') then raise exception 'Secteur invalide ou absent'; end if;
      if jsonb_typeof(row_data -> 'targetMarkets') not in ('array', 'null') then raise exception 'Marchés cibles invalides'; end if;
      if jsonb_typeof(row_data -> 'targetMarkets') = 'array' and jsonb_array_length(row_data -> 'targetMarkets') > 30 then raise exception 'Maximum 30 marchés cibles'; end if;
      if exists (select 1 from jsonb_array_elements_text(coalesce(row_data -> 'targetMarkets', '[]'::jsonb)) value where char_length(btrim(value)) not between 1 and 120) then raise exception 'Nom de marché invalide'; end if;
      markets_value := array(select btrim(value) from jsonb_array_elements_text(coalesce(row_data -> 'targetMarkets', '[]'::jsonb)) value);

      select count(*) into requirement_count
      from public.requirements r
      where r.applicability_status = 'active'
        and r.sector in ('cross-sector', sector_value)
        and (r.effective_from is null or r.effective_from <= current_date)
        and (r.effective_to is null or r.effective_to >= current_date);
      if requirement_count = 0 then
        raise exception 'Aucun référentiel réglementaire actuellement applicable pour le secteur % ; ligne bloquée pour éviter une fausse checklist', sector_value;
      end if;

      insert into public.products (
        org_id, created_by, name, sku, category, sector, manufacturer_name,
        origin_country, target_markets, status, risk_level
      ) values (
        p_org_id, actor_id, name_value, sku_value, nullif(category_value, ''), sector_value,
        nullif(manufacturer_value, ''), nullif(origin_value, ''), markets_value, 'draft', 'unknown'
      ) returning id into product_id;

      insert into public.product_requirements (org_id, product_id, requirement_id, status)
      select p_org_id, product_id, r.id, 'pending'
      from public.requirements r
      where r.applicability_status = 'active'
        and r.sector in ('cross-sector', sector_value)
        and (r.effective_from is null or r.effective_from <= current_date)
        and (r.effective_to is null or r.effective_to >= current_date);
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
    jsonb_build_object('file_name', left(coalesce(p_file_name, 'import.csv'), 240), 'created', created_count, 'skipped', skipped_count));

  return jsonb_build_object('created', created_count, 'skipped', skipped_count, 'errors', errors_value);
end;
$$;
