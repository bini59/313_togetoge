#!/usr/bin/env bash
# Dump gbc-timeline Postgres rows as SQLite INSERTs for D1.
#
# Run on the Oracle host (by a human) from the old compose project:
#   cd ~/312_togetoge
#   bash /path/to/scripts/export-postgres-to-d1.sh > togetoge-d1-data.sql
# Then, from this repo:
#   pnpm exec wrangler d1 execute togetoge --remote --file togetoge-d1-data.sql
#
# Env overrides:
#   PSQL  command that runs psql against the old DB
#         (default: docker exec -i gbc-timeline-db-1 psql -U postgres -d postgres)
#
# Only participation_clients and comments are exported. participations is
# unused by the app and has no D1 table. UUIDs are lowercased, timestamps become
# ISO-8601 UTC with millis (what D1 writes by default). INSERT OR IGNORE makes
# re-runs safe.
#
# Quoting: Postgres quote_literal / format('%L') emit E'...' for strings that
# contain a backslash, which SQLite rejects. sq() builds a plain '...' literal
# with doubled single quotes, valid in both (newlines and backslashes are
# literal inside SQLite strings).
set -euo pipefail

PSQL=${PSQL:-docker exec -i gbc-timeline-db-1 psql -U postgres -d postgres}

$PSQL -X -q -A -t -v ON_ERROR_STOP=1 <<'SQL'
create function pg_temp.sq(v text) returns text language sql immutable as
  $$ select case when v is null then 'NULL' else '''' || replace(v, '''', '''''') || '''' end $$;

create function pg_temp.ts(v timestamptz) returns text language sql immutable as
  $$ select pg_temp.sq(to_char(v at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) $$;

\echo '-- togetoge Postgres -> D1 export'
select format(
  'INSERT OR IGNORE INTO participation_clients (event_id, client_id, created_at) VALUES (%s, %s, %s);',
  pg_temp.sq(event_id),
  pg_temp.sq(lower(client_id::text)),
  pg_temp.ts(created_at)
)
from participation_clients
order by created_at;

select format(
  'INSERT OR IGNORE INTO comments (id, event_id, content, client_id, created_at) VALUES (%s, %s, %s, %s, %s);',
  pg_temp.sq(lower(id::text)),
  pg_temp.sq(event_id),
  pg_temp.sq(content),
  pg_temp.sq(lower(client_id::text)),
  pg_temp.ts(created_at)
)
from comments
order by created_at;

\echo '-- expected row counts (compare with: SELECT count(*) FROM <table> on D1)'
select '-- participation_clients: ' || count(*) from participation_clients;
select '-- comments: ' || count(*) from comments;
SQL
