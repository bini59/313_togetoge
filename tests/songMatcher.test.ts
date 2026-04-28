import { describe, expect, it } from 'vitest'
import { resolveYoutubeId } from '@/lib/songMatcher'
import type { TimelineEvent } from '@/lib/types'

describe('resolveYoutubeId', () => {
  it('returns explicit youtubeId for direct video events', () => {
    const ev: TimelineEvent = {
      id: 'yt-1',
      date: '2024-01-01',
      type: 'youtube',
      title: 'test',
      youtubeId: 'abc12345678',
    }
    expect(resolveYoutubeId(ev)).toBe('abc12345678')
  })

  it('returns null for live event with unknown setlist', () => {
    const ev: TimelineEvent = {
      id: 'live-x',
      date: '2024-01-01',
      type: 'live',
      title: 'unknown',
      setlistId: 'does-not-exist',
    }
    expect(resolveYoutubeId(ev)).toBeNull()
  })

  it('is deterministic per (eventId, sessionSeed) for live events', () => {
    const ev: TimelineEvent = {
      id: 'live-2024-08-25-kinema',
      date: '2024-08-25',
      type: 'live',
      title: 'kinema',
      setlistId: 'live-2024-08-25-kinema',
    }
    const a = resolveYoutubeId(ev, 'seed-1')
    const b = resolveYoutubeId(ev, 'seed-1')
    expect(a).toBe(b)
    expect(a).toBeTruthy()
  })
})
