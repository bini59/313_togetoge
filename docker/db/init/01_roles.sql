-- Supabase-compatible role setup for PostgREST.
-- The "authenticator" role is what PostgREST connects as; it switches into
-- anon/authenticated/service_role based on the JWT "role" claim.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create role authenticator with login password 'authenticator_pw' noinherit;
grant anon, authenticated, service_role to authenticator;

grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant all on functions to service_role;
