-- Togetoge D1 schema (SQLite). Replaces supabase/schema.sql + docker/db/init/*.
--
-- Postgres → SQLite mapping (behavior is covered by tests/db.test.ts):
--   uuid               → TEXT. App code generates/validates lowercase UUIDs
--                        (crypto.randomUUID, lib/clientId.ts) because SQLite
--                        does not validate or normalize them.
--   gen_random_uuid()  → generated in app (lib/db/queries.ts insertComment).
--   timestamptz/now()  → TEXT ISO-8601 UTC with millis ("2026-10-21T01:02:03.456Z"),
--                        same shape as JS Date#toISOString so string order = time order.
--   char_length(...)   → length(...) (both count characters, not bytes).
--   count(*)::int      → count(*) (already an integer in SQLite).
--   RLS / roles / grants → none. D1 is only reachable through the Worker's
--                        DB binding, so the API routes are the only writer.
--   participations table → dropped. Nothing read or wrote it; counts come from
--                        the participation_counts view.

CREATE TABLE participation_clients (
  event_id   TEXT NOT NULL,
  client_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (event_id, client_id)
);

CREATE INDEX idx_participation_clients_event
  ON participation_clients (event_id);

CREATE INDEX idx_participation_clients_client
  ON participation_clients (client_id);

CREATE TABLE comments (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL,
  content    TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  client_id  TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_comments_event_created
  ON comments (event_id, created_at DESC);

CREATE INDEX idx_comments_client_created
  ON comments (client_id, created_at DESC);

CREATE INDEX idx_comments_created
  ON comments (created_at DESC);

CREATE VIEW participation_counts AS
  SELECT event_id, count(*) AS count
  FROM participation_clients
  GROUP BY event_id;
