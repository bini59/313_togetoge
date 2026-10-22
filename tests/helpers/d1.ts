import { readFileSync } from 'node:fs'
import path from 'node:path'
import { getPlatformProxy } from 'wrangler'
import type { D1Database } from '@cloudflare/workers-types'

/**
 * In-memory local D1 (same workerd SQLite as `wrangler dev`), with
 * migrations/*.sql applied. Call dispose() in afterAll.
 */
export async function createTestD1(): Promise<{ db: D1Database; dispose: () => Promise<void> }> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false })
  const db = proxy.env.DB
  const sql = readFileSync(path.resolve(__dirname, '../../migrations/0001_init.sql'), 'utf8')
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  await db.batch(statements.map((s) => db.prepare(s)))
  return { db, dispose: () => proxy.dispose() }
}

export async function resetTables(db: D1Database): Promise<void> {
  await db.batch([db.prepare('DELETE FROM comments'), db.prepare('DELETE FROM participation_clients')])
}
