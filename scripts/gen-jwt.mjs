#!/usr/bin/env node
// Generate anon + service_role JWTs for local Supabase-compatible setup.
// Usage: SUPABASE_JWT_SECRET=... node scripts/gen-jwt.mjs
import crypto from 'node:crypto'

const SECRET =
  process.env.SUPABASE_JWT_SECRET ??
  'super-secret-jwt-token-with-at-least-32-characters-long-for-development'

const b64 = (s) =>
  Buffer.from(typeof s === 'string' ? s : JSON.stringify(s)).toString('base64url')

function sign(role) {
  const header = b64({ alg: 'HS256', typ: 'JWT' })
  const payload = b64({
    iss: 'local',
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 5,
  })
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${sig}`
}

console.log(`SUPABASE_ANON_KEY=${sign('anon')}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY=${sign('service_role')}`)
