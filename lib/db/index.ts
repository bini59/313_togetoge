import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { D1Database } from '@cloudflare/workers-types'

/** D1 binding `DB` (wrangler.jsonc). Works in `next dev` via initOpenNextCloudflareForDev. */
export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  if (!env.DB) throw new Error('Missing D1 binding: DB')
  return env.DB
}
