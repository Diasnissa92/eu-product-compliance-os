-- Keep public passport identifiers, links and payload sizes safe and bounded.

alter table public.products drop constraint if exists products_dpp_identifier_format_check;
alter table public.products add constraint products_dpp_identifier_format_check
  check (dpp_identifier is null or dpp_identifier ~ '^[A-Z0-9][A-Z0-9-]{4,79}$');

alter table public.products drop constraint if exists products_dpp_public_data_check;
alter table public.products add constraint products_dpp_public_data_check check (
  jsonb_typeof(dpp_public_data) = 'object'
  and octet_length(dpp_public_data::text) <= 20000
  and (
    nullif(btrim(dpp_public_data ->> 'supportUrl'), '') is null
    or (
      dpp_public_data ->> 'supportUrl' ~ '^https://[^[:space:]]+$'
      and char_length(dpp_public_data ->> 'supportUrl') <= 2000
    )
  )
);

alter table public.products drop constraint if exists products_dpp_published_identifier_check;
alter table public.products add constraint products_dpp_published_identifier_check
  check (dpp_status <> 'published' or dpp_identifier is not null);
