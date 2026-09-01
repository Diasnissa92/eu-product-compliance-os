-- Keep the public RPC as an invoker function. Only the anonymous server-side
-- client used by the cron route can cross into the non-exposed private schema.

alter function public.verify_runtime_secret(text, text) security invoker;

revoke all on function private.verify_runtime_secret_impl(text, text) from public, authenticated;
grant execute on function private.verify_runtime_secret_impl(text, text) to anon;

revoke all on function public.verify_runtime_secret(text, text) from public, authenticated;
grant execute on function public.verify_runtime_secret(text, text) to anon;
