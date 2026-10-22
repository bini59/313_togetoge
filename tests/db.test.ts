// @vitest-environment node
/**
 * Behaviors that used to come from Postgres/PostgREST, checked on D1 (SQLite).
 * `rg -i` over the old schema/routes found no ILIKE, jsonb, arrays, enums or
 * Postgres functions beyond pgcrypto. What did differ is covered here:
 * uuid type, gen_random_uuid(), timestamptz/now(), char_length CHECK,
 * count(*)::int, RETURNING, and the 23505 unique-violation path.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import {
  insertComment,
  listCommentsForEvent,
  listRecentComments,
  participate,
  participatedEventIds,
  participationCounts,
} from '@/lib/db/queries'
import { normalizeClientId } from '@/lib/clientId'
import { createTestD1, resetTables } from './helpers/d1'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

let db: D1Database
let dispose: () => Promise<void>

beforeAll(async () => {
  ;({ db, dispose } = await createTestD1())
}, 30_000)
afterAll(() => dispose())
beforeEach(() => resetTables(db))

describe('participations (was participation_clients + 23505 handling)', () => {
  it('first click inserts, second click by the same client is a no-op', async () => {
    expect(await participate(db, 'ev-1', 'c1')).toEqual({ count: 1, alreadyParticipated: false })
    expect(await participate(db, 'ev-1', 'c1')).toEqual({ count: 1, alreadyParticipated: true })
    expect(await participate(db, 'ev-1', 'c2')).toEqual({ count: 2, alreadyParticipated: false })
  })

  it('counts are numbers (was count(*)::int)', async () => {
    await participate(db, 'ev-1', 'c1')
    const [row] = await participationCounts(db)
    expect(row).toEqual({ event_id: 'ev-1', count: 1 })
    expect(typeof row.count).toBe('number')
  })

  it('top counts are ordered by count desc and limited', async () => {
    await participate(db, 'a', 'c1')
    for (const c of ['c1', 'c2', 'c3']) await participate(db, 'b', c)
    for (const c of ['c1', 'c2']) await participate(db, 'c', c)
    expect(await participationCounts(db, 2)).toEqual([
      { event_id: 'b', count: 3 },
      { event_id: 'c', count: 2 },
    ])
  })

  it('lists the events a client joined', async () => {
    await participate(db, 'a', 'c1')
    await participate(db, 'b', 'c1')
    await participate(db, 'b', 'c2')
    expect((await participatedEventIds(db, 'c1')).sort()).toEqual(['a', 'b'])
  })

  it('event_id equality is case-sensitive like Postgres text =', async () => {
    await participate(db, 'ev-1', 'c1')
    expect(await participate(db, 'EV-1', 'c1')).toEqual({ count: 1, alreadyParticipated: false })
  })

  it('participation created_at defaults to ISO-8601 UTC (was timestamptz default now())', async () => {
    await participate(db, 'ev-1', 'c1')
    const row = await db.prepare('SELECT created_at FROM participation_clients').first<{ created_at: string }>()
    expect(row?.created_at).toMatch(ISO_RE)
  })
})

describe('client id normalization (was Postgres uuid type)', () => {
  it('lowercases valid UUIDs so the UNIQUE check stays case-insensitive', () => {
    expect(normalizeClientId('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    )
  })

  it('rejects values Postgres uuid would have rejected', () => {
    expect(normalizeClientId('-'.repeat(36))).toBeNull()
    expect(normalizeClientId('not-a-uuid')).toBeNull()
    expect(normalizeClientId(undefined)).toBeNull()
  })
})

describe('comments', () => {
  it('insert returns the row via RETURNING with a v4 uuid and ISO timestamp', async () => {
    const before = Date.now()
    const c = await insertComment(db, { eventId: 'ev-1', content: '안녕', clientId: 'c1' })
    expect(c.id).toMatch(UUID_RE)
    expect(c.event_id).toBe('ev-1')
    expect(c.content).toBe('안녕')
    expect(c.created_at).toMatch(ISO_RE)
    expect(Date.parse(c.created_at)).toBeGreaterThanOrEqual(before - 1000)
    expect(Object.keys(c).sort()).toEqual(['content', 'created_at', 'event_id', 'id'])
  })

  it('content CHECK counts characters like char_length (Korean, emoji)', async () => {
    await expect(insertComment(db, { eventId: 'e', content: '가'.repeat(500), clientId: 'c' })).resolves.toBeTruthy()
    await expect(insertComment(db, { eventId: 'e', content: '😀'.repeat(500), clientId: 'c' })).resolves.toBeTruthy()
    await expect(insertComment(db, { eventId: 'e', content: '가'.repeat(501), clientId: 'c' })).rejects.toThrow(/CHECK/)
    await expect(insertComment(db, { eventId: 'e', content: '', clientId: 'c' })).rejects.toThrow(/CHECK/)
  })

  it('stores quotes, newlines and SQL-looking text verbatim', async () => {
    const content = "it's \"fine\"\n'); DROP TABLE comments; --"
    await insertComment(db, { eventId: 'e', content, clientId: 'c' })
    expect((await listCommentsForEvent(db, 'e'))[0].content).toBe(content)
  })

  it('lists newest first, filtered by event, with a limit', async () => {
    const insertAt = (eventId: string, content: string, iso: string) =>
      db
        .prepare('INSERT INTO comments (id, event_id, content, created_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(crypto.randomUUID(), eventId, content, iso)
        .run()
    await insertAt('a', 'old', '2026-01-01T00:00:00.000Z')
    await insertAt('a', 'new', '2026-01-02T00:00:00.000Z')
    await insertAt('b', 'other', '2026-01-03T00:00:00.000Z')
    expect((await listCommentsForEvent(db, 'a')).map((c) => c.content)).toEqual(['new', 'old'])
    expect((await listCommentsForEvent(db, 'a', 1)).map((c) => c.content)).toEqual(['new'])
    expect((await listRecentComments(db, 2)).map((c) => c.content)).toEqual(['other', 'new'])
  })

  it('same-millisecond comments keep insertion order (newest first)', async () => {
    const iso = '2026-01-01T00:00:00.000Z'
    for (const content of ['1', '2', '3']) {
      await db
        .prepare("INSERT INTO comments (id, event_id, content, created_at) VALUES (?1, 'a', ?2, ?3)")
        .bind(crypto.randomUUID(), content, iso)
        .run()
    }
    expect((await listCommentsForEvent(db, 'a')).map((c) => c.content)).toEqual(['3', '2', '1'])
  })
})
