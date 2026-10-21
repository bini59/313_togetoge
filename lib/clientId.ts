import { cookies } from 'next/headers'

const COOKIE_NAME = 'gbc_client_id'
const ONE_YEAR = 60 * 60 * 24 * 365
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Returns a lowercase UUID. Postgres' uuid type used to validate and
 * lowercase this value; SQLite stores TEXT as-is, so normalize here to keep
 * the (event_id, client_id) UNIQUE check case-insensitive.
 */
export function normalizeClientId(value: string | undefined): string | null {
  return value && UUID_RE.test(value) ? value.toLowerCase() : null
}

export async function getOrCreateClientId(): Promise<string> {
  const store = await cookies()
  const existing = normalizeClientId(store.get(COOKIE_NAME)?.value)
  if (existing) return existing
  const id = crypto.randomUUID()
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  })
  return id
}
