import { setlists, songs } from '@/data/timeline'
import type { TimelineEvent } from './types'

const songById = new Map(songs.map((s) => [s.id, s]))
const setlistById = new Map(setlists.map((s) => [s.id, s]))

function pickRandom<T>(arr: readonly T[], seed: string): T | undefined {
  if (arr.length === 0) return undefined
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const idx = Math.abs(h) % arr.length
  return arr[idx]
}

export function resolveYoutubeId(event: TimelineEvent, sessionSeed = ''): string | null {
  return resolveSong(event, sessionSeed).youtubeId
}

/**
 * Resolve both the YouTube ID and the matching Song (when one exists) for an
 * event. Used when callers need the song's metadata — e.g. highlightStartSec.
 */
export function resolveSong(
  event: TimelineEvent,
  sessionSeed = '',
): { youtubeId: string | null; song: import('./types').Song | null } {
  switch (event.type) {
    case 'live':
    case 'fes': {
      if (event.liveYoutubeId) return { youtubeId: event.liveYoutubeId, song: null }
      const list = setlistById.get(event.setlistId)
      if (!list) return { youtubeId: null, song: null }
      const songId = pickRandom(list.songIds, event.id + sessionSeed)
      if (!songId) return { youtubeId: null, song: null }
      const song = songById.get(songId) ?? null
      return { youtubeId: song?.youtubeId ?? null, song }
    }
    case 'album': {
      const song = songById.get(event.titleSongId) ?? null
      return { youtubeId: song?.youtubeId ?? null, song }
    }
    default: {
      if (event.youtubeId) return { youtubeId: event.youtubeId, song: null }
      if (event.songId) {
        const song = songById.get(event.songId) ?? null
        return { youtubeId: song?.youtubeId ?? null, song }
      }
      return { youtubeId: null, song: null }
    }
  }
}
