-- Keep public API functions as SECURITY INVOKER and grant only the minimal
-- private-schema capabilities they need. The private schema is not exposed by
-- PostgREST, so clients cannot address these implementation functions directly.

alter function public.accept_my_organization_invitations() security invoker;
alter function public.add_requirement_comment(uuid, text) security invoker;
alter function public.apply_document_analysis(uuid) security invoker;
alter function public.assign_product_requirement(uuid, uuid, date) security invoker;
alter function public.create_incident_from_safety_gate(uuid, uuid) security invoker;
alter function public.get_public_product_passport(text) security invoker;
alter function public.get_supplier_request_portal(uuid) security invoker;
alter function public.import_products(uuid, text, jsonb) security invoker;
alter function public.onboard_my_organization(text, text, text, text) security invoker;
alter function public.submit_supplier_response(uuid, text, text, text, text, text) security invoker;
alter function public.sync_safety_gate_alerts(text, text, date, jsonb) security invoker;
alter function public.update_organization_member_role(uuid, uuid, text) security invoker;
alter function public.verify_runtime_secret(text, text) security invoker;

-- Remove PostgreSQL's default PUBLIC EXECUTE from every private function before
-- opening schema USAGE. Trigger functions continue to execute through triggers.
revoke all on all functions in schema private from public, anon, authenticated, service_role;
grant usage on schema private to anon, authenticated, service_role;

-- Public anonymous portal operations.
grant execute on function private.get_public_product_passport_impl(text) to anon, authenticated, service_role;
grant execute on function private.get_supplier_request_portal_impl(uuid) to anon, authenticated, service_role;
grant execute on function private.submit_supplier_response_impl(uuid, text, text, text, text, text) to anon, authenticated, service_role;

-- Authenticated organization operations.
grant execute on function private.accept_my_organization_invitations_impl() to authenticated, service_role;
grant execute on function private.create_incident_from_safety_gate_impl(uuid, uuid) to authenticated, service_role;
grant execute on function private.import_products_impl(uuid, text, jsonb) to authenticated, service_role;
grant execute on function private.onboard_my_organization_impl(text, text, text, text) to authenticated, service_role;
grant execute on function private.update_organization_member_role_impl(uuid, uuid, text) to authenticated, service_role;

-- Helpers referenced by RLS-aware public functions and policies.
grant execute on function private.has_org_role(uuid, uuid, text[]) to authenticated, service_role;
grant execute on function private.is_org_member(uuid, uuid) to authenticated, service_role;
grant execute on function private.safe_iso_date(text) to authenticated, service_role;
grant execute on function private.shares_organization_with_profile(uuid) to authenticated, service_role;

-- Safety Gate cron uses the anonymous API key plus a separate strong runtime
-- secret. Signed-in users do not receive either execution privilege.
grant execute on function private.sync_safety_gate_alerts_impl(text, text, date, jsonb) to anon, service_role;
grant execute on function private.verify_runtime_secret_impl(text, text) to anon, service_role;
