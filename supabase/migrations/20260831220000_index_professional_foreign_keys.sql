-- Cover foreign keys used by cascades, joins and incident/supplier workflows.

create index if not exists corrective_actions_created_by_idx on public.corrective_actions (created_by);
create index if not exists corrective_actions_incident_org_idx on public.corrective_actions (incident_id, org_id);
create index if not exists corrective_actions_owner_id_idx on public.corrective_actions (owner_id) where owner_id is not null;

create index if not exists ecommerce_audits_created_by_idx on public.ecommerce_audits (created_by);
create index if not exists ecommerce_audits_product_org_idx on public.ecommerce_audits (product_id, org_id);

create index if not exists product_imports_created_by_idx on public.product_imports (created_by);
create index if not exists product_incidents_created_by_idx on public.product_incidents (created_by);
create index if not exists product_incidents_owner_id_idx on public.product_incidents (owner_id) where owner_id is not null;
create index if not exists product_incidents_product_org_idx on public.product_incidents (product_id, org_id) where product_id is not null;

create index if not exists safety_gate_matches_created_by_idx on public.safety_gate_matches (created_by);
create index if not exists safety_gate_matches_product_org_idx on public.safety_gate_matches (product_id, org_id) where product_id is not null;
create index if not exists safety_gate_matches_watch_org_idx on public.safety_gate_matches (watch_id, org_id) where watch_id is not null;

create index if not exists safety_gate_watches_created_by_idx on public.safety_gate_watches (created_by);
create index if not exists safety_gate_watches_product_org_idx on public.safety_gate_watches (product_id, org_id) where product_id is not null;

create index if not exists supplier_requests_created_by_idx on public.supplier_requests (created_by);
create index if not exists supplier_requests_requirement_idx on public.supplier_requests (product_requirement_id) where product_requirement_id is not null;
create index if not exists supplier_requests_product_org_idx on public.supplier_requests (product_id, org_id);

create index if not exists supplier_responses_product_org_idx on public.supplier_responses (product_id, org_id);
create index if not exists supplier_responses_request_scope_idx on public.supplier_responses (request_id, org_id, product_id);
