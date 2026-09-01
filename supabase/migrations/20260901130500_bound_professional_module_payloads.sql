-- Enforce the same input bounds in PostgreSQL as in the UI/RPC layer.

alter table public.ecommerce_audits drop constraint if exists ecommerce_audits_marketplace_check;
alter table public.ecommerce_audits add constraint ecommerce_audits_marketplace_check check (char_length(btrim(marketplace)) between 1 and 120);
alter table public.ecommerce_audits drop constraint if exists ecommerce_audits_listing_url_check;
alter table public.ecommerce_audits add constraint ecommerce_audits_listing_url_check check (listing_url is null or (listing_url ~* '^https://[^[:space:]]+$' and char_length(listing_url) <= 2000));
alter table public.ecommerce_audits drop constraint if exists ecommerce_audits_listing_data_size_check;
alter table public.ecommerce_audits add constraint ecommerce_audits_listing_data_size_check check (jsonb_typeof(listing_data) = 'object' and octet_length(listing_data::text) <= 30000);
alter table public.ecommerce_audits drop constraint if exists ecommerce_audits_findings_size_check;
alter table public.ecommerce_audits add constraint ecommerce_audits_findings_size_check check (jsonb_typeof(findings) = 'array' and octet_length(findings::text) <= 50000);

alter table public.supplier_requests drop constraint if exists supplier_requests_requested_items_check;
alter table public.supplier_requests add constraint supplier_requests_requested_items_check check (cardinality(requested_items) between 1 and 50 and octet_length(array_to_string(requested_items, ',')) <= 12000);
alter table public.supplier_requests drop constraint if exists supplier_requests_message_check;
alter table public.supplier_requests add constraint supplier_requests_message_check check (message is null or char_length(message) <= 6000);

alter table public.supplier_responses drop constraint if exists supplier_responses_document_url_check;
alter table public.supplier_responses add constraint supplier_responses_document_url_check check (document_url ~* '^https://[^[:space:]]+$' and char_length(document_url) <= 2000);

alter table public.safety_gate_watches drop constraint if exists safety_gate_watches_category_check;
alter table public.safety_gate_watches add constraint safety_gate_watches_category_check check (category is null or char_length(btrim(category)) between 3 and 120);
alter table public.safety_gate_matches drop constraint if exists safety_gate_matches_reference_check;
alter table public.safety_gate_matches add constraint safety_gate_matches_reference_check check (char_length(btrim(alert_reference)) between 1 and 80);
alter table public.safety_gate_matches drop constraint if exists safety_gate_matches_title_check;
alter table public.safety_gate_matches add constraint safety_gate_matches_title_check check (char_length(btrim(title)) between 1 and 500);
alter table public.safety_gate_matches drop constraint if exists safety_gate_matches_risk_level_check;
alter table public.safety_gate_matches add constraint safety_gate_matches_risk_level_check check (risk_level in ('serious','high','medium'));

alter table public.product_imports drop constraint if exists product_imports_file_name_check;
alter table public.product_imports add constraint product_imports_file_name_check check (char_length(btrim(file_name)) between 1 and 240);
alter table public.product_imports drop constraint if exists product_imports_errors_size_check;
alter table public.product_imports add constraint product_imports_errors_size_check check (jsonb_typeof(errors) = 'array' and octet_length(errors::text) <= 50000);
