-- Remove materialized checklist links that were created before applicability
-- gating existed. Keep documents and immutable audit history, and record the
-- regulatory correction explicitly.

do $$
declare
  v_product record;
begin
  for v_product in
    select distinct p.id, p.org_id
    from public.products p
    join public.product_requirements pr on pr.product_id = p.id and pr.org_id = p.org_id
    join public.requirements r on r.id = pr.requirement_id
    where r.applicability_status <> 'active'
  loop
    insert into public.audit_events (org_id, user_id, entity_type, entity_id, action, payload)
    values (
      v_product.org_id,
      null,
      'product',
      v_product.id::text,
      'Checklist réglementaire retirée après correction d’applicabilité',
      jsonb_build_object(
        'reason', 'requirements_not_currently_applicable',
        'engine_correction', 'phase2_2026-09-01',
        'history_preserved', true
      )
    );
  end loop;
end $$;

delete from public.product_requirements pr
using public.requirements r
where r.id = pr.requirement_id
  and r.applicability_status <> 'active';

update public.products p
set status = 'draft',
    compliance_score = 0,
    risk_level = 'unknown',
    updated_at = now()
where not exists (
  select 1
  from public.product_requirements pr
  where pr.product_id = p.id
    and pr.org_id = p.org_id
)
and p.status in ('blocked', 'ready');
