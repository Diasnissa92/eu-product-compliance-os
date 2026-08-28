create unique index if not exists documents_id_org_product_key
  on public.documents (id, org_id, product_id);

create table public.document_analyses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  document_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'applied')),
  model text not null,
  prompt_version text not null,
  result jsonb,
  token_usage jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric(12, 6)
    check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  applied_at timestamptz,
  constraint document_analyses_document_scope_fkey
    foreign key (document_id, org_id, product_id)
    references public.documents (id, org_id, product_id)
    on delete cascade
);

create index document_analyses_org_product_created_idx
  on public.document_analyses (org_id, product_id, created_at desc);

create index document_analyses_document_created_idx
  on public.document_analyses (document_id, created_at desc);

alter table public.document_analyses enable row level security;

revoke all on table public.document_analyses from anon;
grant select, insert, update, delete on table public.document_analyses to authenticated;

create policy "document_analyses_select_member"
on public.document_analyses
for select
to authenticated
using (
  private.is_org_member(org_id, (select auth.uid()))
);

create policy "document_analyses_insert_collaborator"
on public.document_analyses
for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and status = 'pending'
  and result is null
  and private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor', 'reviewer']
  )
  and exists (
    select 1
    from public.documents
    where documents.id = document_analyses.document_id
      and documents.org_id = document_analyses.org_id
      and documents.product_id = document_analyses.product_id
  )
);

create policy "document_analyses_update_collaborator"
on public.document_analyses
for update
to authenticated
using (
  requested_by = (select auth.uid())
  or private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  )
)
with check (
  private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor', 'reviewer']
  )
);

create policy "document_analyses_delete_admin"
on public.document_analyses
for delete
to authenticated
using (
  private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin']
  )
);

create or replace function private.safe_iso_date(value text)
returns date
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
begin
  if value !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return value::date;
exception when others then
  return null;
end;
$$;

revoke all on function private.safe_iso_date(text) from public, anon;
grant execute on function private.safe_iso_date(text) to authenticated;

create or replace function public.apply_document_analysis(p_analysis_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  analysis public.document_analyses%rowtype;
  requirement_match jsonb;
  linked_requirements integer := 0;
  issue_date_value date;
  expiry_date_value date;
begin
  select *
  into analysis
  from public.document_analyses
  where id = p_analysis_id
    and status = 'completed';

  if not found then
    raise exception 'Analyse introuvable ou non finalisée';
  end if;

  if not private.has_org_role(
    analysis.org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  ) then
    raise exception 'Droits de contribution requis';
  end if;

  if jsonb_typeof(analysis.result) <> 'object' then
    raise exception 'Résultat d’analyse invalide';
  end if;

  issue_date_value := private.safe_iso_date(analysis.result ->> 'issueDate');
  expiry_date_value := private.safe_iso_date(analysis.result ->> 'expiryDate');

  update public.documents
  set title = coalesce(nullif(analysis.result ->> 'suggestedTitle', ''), title),
      document_type = coalesce(nullif(analysis.result ->> 'documentType', ''), document_type),
      issuing_body = coalesce(nullif(analysis.result ->> 'issuingBody', ''), issuing_body),
      issue_date = coalesce(issue_date_value, issue_date),
      expiry_date = coalesce(expiry_date_value, expiry_date),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'ai_analysis', jsonb_build_object(
          'analysis_id', analysis.id,
          'model', analysis.model,
          'applied_at', now(),
          'manufacturer_name', analysis.result -> 'manufacturerName',
          'product_reference', analysis.result -> 'productReference',
          'standards', coalesce(analysis.result -> 'standards', '[]'::jsonb),
          'regulation_references', coalesce(analysis.result -> 'regulationReferences', '[]'::jsonb),
          'languages', coalesce(analysis.result -> 'languageCodes', '[]'::jsonb),
          'confidence', analysis.result -> 'confidence',
          'evidence_quality', analysis.result -> 'evidenceQuality',
          'summary', analysis.result -> 'summary',
          'warnings', coalesce(analysis.result -> 'warnings', '[]'::jsonb)
        )
      ),
      updated_at = now()
  where id = analysis.document_id
    and org_id = analysis.org_id
    and product_id = analysis.product_id;

  if jsonb_typeof(analysis.result -> 'requirementMatches') = 'array' then
    for requirement_match in
      select value from jsonb_array_elements(analysis.result -> 'requirementMatches')
    loop
      if coalesce(requirement_match ->> 'productRequirementId', '') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then
        update public.product_requirements
        set evidence_document_id = analysis.document_id,
            updated_at = now()
        where id = (requirement_match ->> 'productRequirementId')::uuid
          and org_id = analysis.org_id
          and product_id = analysis.product_id;
        if found then
          linked_requirements := linked_requirements + 1;
        end if;
      end if;
    end loop;
  end if;

  update public.document_analyses
  set status = 'applied',
      applied_at = now()
  where id = analysis.id;

  insert into public.audit_events (
    org_id,
    user_id,
    entity_type,
    entity_id,
    action,
    payload
  ) values (
    analysis.org_id,
    (select auth.uid()),
    'document',
    analysis.product_id,
    'Analyse documentaire validée',
    jsonb_build_object(
      'document_id', analysis.document_id,
      'analysis_id', analysis.id,
      'linked_requirements', linked_requirements
    )
  );

  return jsonb_build_object(
    'document_id', analysis.document_id,
    'analysis_id', analysis.id,
    'linked_requirements', linked_requirements
  );
end;
$$;

revoke all on function public.apply_document_analysis(uuid) from public, anon;
grant execute on function public.apply_document_analysis(uuid) to authenticated;
