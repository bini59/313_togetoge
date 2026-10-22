import type { D1Database } from '@cloudflare/workers-types'

export interface CommentRow {
  id: string
  event_id: string
  content: string
  created_at: string
}

export interface CountRow {
  event_id: string
  count: number
}

const COMMENT_COLUMNS = 'id, event_id, content, created_at'

export async function listCommentsForEvent(
  db: D1Database,
  eventId: string,
  limit = 100,
): Promise<CommentRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${COMMENT_COLUMNS} FROM comments
       WHERE event_id = ?1
       ORDER BY created_at DESC, rowid DESC
       LIMIT ?2`,
    )
    .bind(eventId, limit)
    .all<CommentRow>()
  return results
}

export async function listRecentComments(db: D1Database, limit = 20): Promise<CommentRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${COMMENT_COLUMNS} FROM comments
       ORDER BY created_at DESC, rowid DESC
       LIMIT ?1`,
    )
    .bind(limit)
    .all<CommentRow>()
  return results
}

export async function insertComment(
  db: D1Database,
  input: { eventId: string; content: string; clientId: string },
): Promise<CommentRow> {
  const row = await db
    .prepare(
      `INSERT INTO comments (id, event_id, content, client_id)
       VALUES (?1, ?2, ?3, ?4)
       RETURNING ${COMMENT_COLUMNS}`,
    )
    .bind(crypto.randomUUID(), input.eventId, input.content, input.clientId)
    .first<CommentRow>()
  if (!row) throw new Error('insert returned no row')
  return row
}

/** created_at of this client's comments in the last `sinceIso` window, newest first. */
export async function recentCommentTimes(
  db: D1Database,
  clientId: string,
  sinceIso: string,
  limit: number,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT created_at FROM comments
       WHERE client_id = ?1 AND created_at >= ?2
       ORDER BY created_at DESC
       LIMIT ?3`,
    )
    .bind(clientId, sinceIso, limit)
    .all<{ created_at: string }>()
  return results.map((r) => r.created_at)
}

/**
 * Records a participation. Duplicate (event, client) pairs are ignored by the
 * UNIQUE constraint, replacing the old Postgres 23505 error-code check.
 * Insert + count run in one batch (a single transaction in D1).
 */
export async function participate(
  db: D1Database,
  eventId: string,
  clientId: string,
): Promise<{ count: number; alreadyParticipated: boolean }> {
  const [insertRes, countRes] = await db.batch<{ count: number }>([
    db
      .prepare(
        `INSERT INTO participation_clients (event_id, client_id)
         VALUES (?1, ?2)
         ON CONFLICT (event_id, client_id) DO NOTHING`,
      )
      .bind(eventId, clientId),
    db
      .prepare('SELECT count(*) AS count FROM participation_clients WHERE event_id = ?1')
      .bind(eventId),
  ])
  return {
    count: countRes.results[0]?.count ?? 0,
    alreadyParticipated: insertRes.meta.changes === 0,
  }
}

export async function participationCounts(db: D1Database, limit?: number): Promise<CountRow[]> {
  const stmt =
    limit === undefined
      ? db.prepare('SELECT event_id, count FROM participation_counts')
      : db
          .prepare(
            'SELECT event_id, count FROM participation_counts ORDER BY count DESC, event_id LIMIT ?1',
          )
          .bind(limit)
  const { results } = await stmt.all<CountRow>()
  return results
}

export async function participatedEventIds(db: D1Database, clientId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT event_id FROM participation_clients WHERE client_id = ?1')
    .bind(clientId)
    .all<{ event_id: string }>()
  return results.map((r) => r.event_id)
}
