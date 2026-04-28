import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'

const COOKIE_NAME = 'gbc_client_id'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function getOrCreateClientId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(COOKIE_NAME)?.value
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing
  const id = randomUUID()
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  })
  return id
}
