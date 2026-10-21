// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { D1Database } from '@cloudflare/workers-types'
import { checkCommentRate } from '@/lib/rateLimit'
import { createTestD1, resetTables } from './helpers/d1'

let db: D1Database
let dispose: () => Promise<void>

beforeAll(async () => {
  ;({ db, dispose } = await createTestD1())
}, 30_000)
afterAll(() => dispose())
beforeEach(() => resetTables(db))

const NOW = Date.parse('2026-10-21T12:00:00.000Z')

async function commentAt(clientId: string, msAgo: number) {
  await db
    .prepare(`INSERT INTO comments (id, event_id, content, client_id, created_at) VALUES (?1, 'e', 'x', ?2, ?3)`)
    .bind(crypto.randomUUID(), clientId, new Date(NOW - msAgo).toISOString())
    .run()
}

describe('checkCommentRate (D1)', () => {
  it('allows when no recent comments', async () => {
    expect(await checkCommentRate(db, 'client-1', undefined, NOW)).toEqual({ ok: true })
  })

  it('blocks within cooldown window', async () => {
    await commentAt('client-1', 1_000)
    const d = await checkCommentRate(db, 'client-1', { minIntervalMs: 10_000, perHourMax: 20 }, NOW)
    expect(d).toEqual({ ok: false, reason: 'cooldown', retryAfterMs: 9_000 })
  })

  it('only counts the same client', async () => {
    await commentAt('client-2', 1_000)
    expect((await checkCommentRate(db, 'client-1', undefined, NOW)).ok).toBe(true)
  })

  it('blocks at hourly cap', async () => {
    for (let i = 0; i < 20; i++) await commentAt('client-1', 60_000 + i)
    const d = await checkCommentRate(db, 'client-1', { minIntervalMs: 1, perHourMax: 20 }, NOW)
    expect(d.ok).toBe(false)
    expect(d.reason).toBe('hourly_cap')
  })

  it('ignores comments older than one hour (ISO string comparison)', async () => {
    for (let i = 0; i < 20; i++) await commentAt('client-1', 60 * 60 * 1000 + 1 + i)
    expect((await checkCommentRate(db, 'client-1', { minIntervalMs: 1, perHourMax: 20 }, NOW)).ok).toBe(true)
  })

  it('fails open on infra error', async () => {
    const broken = {
      prepare: () => {
        throw new Error('boom')
      },
    } as unknown as D1Database
    expect(await checkCommentRate(broken, 'client-1')).toEqual({ ok: true })
  })
})
