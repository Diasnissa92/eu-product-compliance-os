create or replace function public.review_product_requirement(
  p_product_requirement_id uuid,
  p_document_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_product_id uuid;
  v_score smallint;
  v_product_status text;
  v_risk_level text;
  v_has_blocking_failure boolean;
  v_has_rejected_evidence boolean;
  v_has_open_requirement boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Unsupported review decision';
  end if;

  select pr.org_id, pr.product_id
  into v_org_id, v_product_id
  from public.product_requirements pr
  where pr.id = p_product_requirement_id
  for update;

  if v_org_id is null then
    raise exception 'Product requirement not found';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_org_id
      and om.user_id = v_user_id
      and om.role = any (array['owner', 'admin', 'editor'])
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if not exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.org_id = v_org_id
      and d.product_id = v_product_id
  ) then
    raise exception 'Evidence document not found for this product';
  end if;

  update public.documents
  set status = case when p_decision = 'approved' then 'valid' else 'invalid' end,
      updated_at = now()
  where id = p_document_id;

  update public.product_requirements
  set evidence_document_id = p_document_id,
      status = case when p_decision = 'approved' then 'compliant' else 'non_compliant' end,
      checked_by = v_user_id,
      last_checked_at = now(),
      updated_at = now()
  where id = p_product_requirement_id;

  select coalesce(
    round(
      100 * sum(
        case pr.status
          when 'compliant' then weights.weight
          when 'not_applicable' then weights.weight
          when 'pending' then weights.weight * 0.45
          when 'in_review' then weights.weight * 0.45
          else 0
        end
      ) / nullif(sum(weights.weight), 0)
    ),
    0
  )::smallint
  into v_score
  from public.product_requirements pr
  join public.requirements r on r.id = pr.requirement_id
  cross join lateral (
    select case
      when not r.mandatory then 1::numeric
      when r.requirement_type in ('document', 'test') then 4::numeric
      when r.requirement_type in ('label', 'dpp') then 3::numeric
      else 2::numeric
    end as weight
  ) weights
  where pr.product_id = v_product_id
    and pr.org_id = v_org_id;

  select
    coalesce(bool_or(
      r.mandatory
      and r.requirement_type in ('document', 'test')
      and pr.status in ('missing', 'non_compliant')
    ), false),
    coalesce(bool_or(pr.status = 'non_compliant'), false),
    coalesce(bool_or(pr.status in ('pending', 'missing', 'in_review')), false)
  into v_has_blocking_failure, v_has_rejected_evidence, v_has_open_requirement
  from public.product_requirements pr
  join public.requirements r on r.id = pr.requirement_id
  where pr.product_id = v_product_id
    and pr.org_id = v_org_id;

  if v_has_blocking_failure then
    v_product_status := 'blocked';
    v_risk_level := 'critical';
  elsif v_has_rejected_evidence then
    v_product_status := 'review';
    v_risk_level := 'high';
  elsif v_has_open_requirement then
    v_product_status := 'review';
    v_risk_level := 'medium';
  else
    v_product_status := 'ready';
    v_risk_level := 'low';
  end if;

  update public.products
  set compliance_score = v_score,
      status = v_product_status,
      risk_level = v_risk_level,
      updated_at = now()
  where id = v_product_id
    and org_id = v_org_id;

  insert into public.audit_events (
    org_id,
    user_id,
    entity_type,
    entity_id,
    action,
    payload
  ) values (
    v_org_id,
    v_user_id,
    'product',
    v_product_id,
    case when p_decision = 'approved' then 'Preuve validée' else 'Preuve refusée' end,
    jsonb_build_object(
      'product_requirement_id', p_product_requirement_id,
      'document_id', p_document_id,
      'decision', p_decision,
      'compliance_score', v_score
    )
  );

  return jsonb_build_object(
    'product_id', v_product_id,
    'product_requirement_id', p_product_requirement_id,
    'document_id', p_document_id,
    'decision', p_decision,
    'compliance_score', v_score,
    'product_status', v_product_status,
    'risk_level', v_risk_level
  );
end;
$$;

revoke all on function public.review_product_requirement(uuid, uuid, text) from public;
revoke all on function public.review_product_requirement(uuid, uuid, text) from anon;
grant execute on function public.review_product_requirement(uuid, uuid, text) to authenticated;

create index if not exists product_requirements_evidence_document_idx
  on public.product_requirements (evidence_document_id)
  where evidence_document_id is not null;
