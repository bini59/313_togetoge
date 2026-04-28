import type { SupabaseClient } from '@supabase/supabase-js'

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
  sb: SupabaseClient,
  clientId: string,
  limits: CommentRateLimit = DEFAULT_COMMENT_LIMITS,
): Promise<RateLimitDecision> {
  const now = Date.now()
  const sinceHour = new Date(now - 60 * 60 * 1000).toISOString()

  const { data, error } = await sb
    .from('comments')
    .select('created_at')
    .eq('client_id', clientId)
    .gte('created_at', sinceHour)
    .order('created_at', { ascending: false })
    .limit(limits.perHourMax)

  if (error) {
    // On query failure, fail open — don't block the user because of infra.
    return { ok: true }
  }

  const rows = data ?? []
  if (rows.length > 0) {
    const lastMs = new Date(rows[0].created_at as string).getTime()
    const delta = now - lastMs
    if (delta < limits.minIntervalMs) {
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterMs: limits.minIntervalMs - delta,
      }
    }
  }

  if (rows.length >= limits.perHourMax) {
    return { ok: false, reason: 'hourly_cap', retryAfterMs: 60 * 60 * 1000 }
  }

  return { ok: true }
}
