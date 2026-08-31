-- Schedule the official Safety Gate synchronization from Postgres.
-- Runtime credentials and the production endpoint are stored separately in
-- Supabase Vault, so no operational secret is committed to source control.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function private.verify_runtime_secret_impl(p_name text, p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name = 'safety_gate_cron'
    and exists (
      select 1
      from private.runtime_secrets
      where name = p_name
        and extensions.digest(coalesce(p_secret, ''), 'sha256') = secret_sha256
    );
$$;

revoke all on function private.verify_runtime_secret_impl(text, text) from public, anon, authenticated;

create or replace function public.verify_runtime_secret(p_name text, p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.verify_runtime_secret_impl($1, $2); $$;

revoke all on function public.verify_runtime_secret(text, text) from public;
grant execute on function public.verify_runtime_secret(text, text) to anon, authenticated;

create or replace function private.invoke_safety_gate_sync()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  sync_url text;
  sync_secret text;
  request_id bigint;
begin
  select decrypted_secret into sync_url
  from vault.decrypted_secrets
  where name = 'safety_gate_sync_url'
  limit 1;

  select decrypted_secret into sync_secret
  from vault.decrypted_secrets
  where name = 'safety_gate_cron'
  limit 1;

  if sync_url is null or sync_secret is null then
    raise exception 'Safety Gate scheduler configuration is missing';
  end if;
  if sync_url !~ '^https://[A-Za-z0-9.-]+/api/cron/safety-gate$' then
    raise exception 'Safety Gate scheduler URL is invalid';
  end if;
  if sync_secret !~ '^[0-9a-f]{64}$' then
    raise exception 'Safety Gate scheduler secret is invalid';
  end if;

  select net.http_get(
    url := sync_url,
    headers := jsonb_build_object(
      'Accept', 'application/json',
      'Authorization', 'Bearer ' || sync_secret
    ),
    timeout_milliseconds := 60000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_safety_gate_sync() from public, anon, authenticated;
grant execute on function private.invoke_safety_gate_sync() to postgres;

do $schedule$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'safety-gate-daily-sync'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'safety-gate-daily-sync',
    '0 5 * * *',
    'select private.invoke_safety_gate_sync();'
  );
end;
$schedule$;
