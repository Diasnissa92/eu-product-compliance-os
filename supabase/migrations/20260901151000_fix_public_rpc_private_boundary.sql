-- Public RPCs are the only supported entry points. They must be able to call
-- private helpers without granting callers USAGE on the private schema.
-- Keep search_path empty and preserve the existing explicit auth/role/secret
-- checks in each implementation.

alter function public.accept_my_organization_invitations() security definer;
alter function public.add_requirement_comment(uuid, text) security definer;
alter function public.apply_document_analysis(uuid) security definer;
alter function public.assign_product_requirement(uuid, uuid, date) security definer;
alter function public.create_incident_from_safety_gate(uuid, uuid) security definer;
alter function public.get_public_product_passport(text) security definer;
alter function public.get_supplier_request_portal(uuid) security definer;
alter function public.import_products(uuid, text, jsonb) security definer;
alter function public.onboard_my_organization(text, text, text, text) security definer;
alter function public.submit_supplier_response(uuid, text, text, text, text, text) security definer;
alter function public.sync_safety_gate_alerts(text, text, date, jsonb) security definer;
alter function public.update_organization_member_role(uuid, uuid, text) security definer;
alter function public.verify_runtime_secret(text, text) security definer;

-- Callers must never invoke implementation functions directly. SECURITY DEFINER
-- wrappers execute as the function owner and do not require these grants.
revoke execute on function private.accept_my_organization_invitations_impl() from anon, authenticated;
revoke execute on function private.create_incident_from_safety_gate_impl(uuid, uuid) from anon, authenticated;
revoke execute on function private.get_public_product_passport_impl(text) from anon, authenticated;
revoke execute on function private.get_supplier_request_portal_impl(uuid) from anon, authenticated;
revoke execute on function private.import_products_impl(uuid, text, jsonb) from anon, authenticated;
revoke execute on function private.onboard_my_organization_impl(text, text, text, text) from anon, authenticated;
revoke execute on function private.submit_supplier_response_impl(uuid, text, text, text, text, text) from anon, authenticated;
revoke execute on function private.sync_safety_gate_alerts_impl(text, text, date, jsonb) from anon, authenticated;
revoke execute on function private.update_organization_member_role_impl(uuid, uuid, text) from anon, authenticated;
revoke execute on function private.verify_runtime_secret_impl(text, text) from anon, authenticated;
