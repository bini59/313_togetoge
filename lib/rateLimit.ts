import type { D1Database } from '@cloudflare/workers-types'
import { recentCommentTimes } from '@/lib/db/queries'

export interface CommentRateLimit {
  /** Cooldown between consecutive comments (ms). */
  minIntervalMs: number
  /** Hourly cap per client. */
  perHourMax: number
}

export const DEFAULT_COMMENT_LIMITS: CommentRateLimit = {
  minIntervalMs: 10_000,
  perHourMax: 20,
}

export interface RateLimitDecision {
  ok: boolean
  reason?: 'cooldown' | 'hourly_cap'
  retryAfterMs?: number
}

export async function checkCommentRate(
  db: D1Database,
  clientId: string,
  limits: CommentRateLimit = DEFAULT_COMMENT_LIMITS,
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const sinceHour = new Date(now - 60 * 60 * 1000).toISOString()

  let times: string[]
  try {
    times = await recentCommentTimes(db, clientId, sinceHour, limits.perHourMax)
  } catch {
    // On query failure, fail open — don't block the user because of infra.
    return { ok: true }
  }

  if (times.length > 0) {
    const delta = now - new Date(times[0]).getTime()
    if (delta < limits.minIntervalMs) {
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterMs: limits.minIntervalMs - delta,
      }
    }
  }

  if (times.length >= limits.perHourMax) {
    return { ok: false, reason: 'hourly_cap', retryAfterMs: 60 * 60 * 1000 }
  }

  return { ok: true }
}
