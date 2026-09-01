-- Final release-gate hardening for the six professional modules.
-- Keep legacy DPP lifecycle values compatible while allowing the passport UI
-- to persist its draft/published states, prevent duplicate Safety Gate incidents,
-- and minimize execution privileges for the automated synchronization RPC.

alter table public.products drop constraint if exists products_dpp_status_check;
alter table public.products add constraint products_dpp_status_check
  check (dpp_status in ('not_applicable','preparing','ready','registered','draft','published'));

create unique index if not exists product_incidents_safety_gate_reference_idx
  on public.product_incidents (org_id, reference)
  where source = 'safety_gate' and reference is not null;

revoke execute on function public.sync_safety_gate_alerts(text, text, date, jsonb) from authenticated;
revoke execute on function private.sync_safety_gate_alerts_impl(text, text, date, jsonb) from authenticated;
