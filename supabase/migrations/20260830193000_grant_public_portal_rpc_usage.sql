-- Public RPC wrappers call narrowly scoped private implementations. Schema
-- usage is required for name resolution; individual functions remain locked
-- down through explicit EXECUTE grants.
grant usage on schema private to anon;

