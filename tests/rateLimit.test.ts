import { describe, expect, it, vi } from 'vitest'
import { checkCommentRate } from '@/lib/rateLimit'

interface FakeQuery {
  data: { created_at: string }[] | null
  error: { message: string } | null
}

function fakeClient(rows: { created_at: string }[] | null, error: FakeQuery['error'] = null) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error })
  const order = vi.fn().mockReturnValue({ limit })
  const gte = vi.fn().mockReturnValue({ order })
  const eq = vi.fn().mockReturnValue({ gte })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

describe('checkCommentRate', () => {
  it('allows when no recent comments', async () => {
    const sb = fakeClient([])
    const d = await checkCommentRate(sb, 'client-1')
    expect(d.ok).toBe(true)
  })

  it('blocks within cooldown window', async () => {
    const sb = fakeClient([{ created_at: new Date(Date.now() - 1000).toISOString() }])
    const d = await checkCommentRate(sb, 'client-1', { minIntervalMs: 10_000, perHourMax: 20 })
    expect(d.ok).toBe(false)
    expect(d.reason).toBe('cooldown')
    expect(d.retryAfterMs).toBeGreaterThan(0)
  })

  it('blocks at hourly cap', async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    const rows = Array.from({ length: 20 }, () => ({ created_at: past }))
    const sb = fakeClient(rows, null)
    const d = await checkCommentRate(sb, 'client-1', { minIntervalMs: 1, perHourMax: 20 })
    expect(d.ok).toBe(false)
    expect(d.reason).toBe('hourly_cap')
  })

  it('fails open on infra error', async () => {
    const sb = fakeClient(null, { message: 'boom' })
    const d = await checkCommentRate(sb, 'client-1')
    expect(d.ok).toBe(true)
  })
})
