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
  switch (event.type) {
    case 'live':
    case 'fes': {
      const list = setlistById.get(event.setlistId)
      if (!list) return null
      const songId = pickRandom(list.songIds, event.id + sessionSeed)
      if (!songId) return null
      return songById.get(songId)?.youtubeId ?? null
    }
    case 'album':
      return songById.get(event.titleSongId)?.youtubeId ?? null
    default: {
      if (event.youtubeId) return event.youtubeId
      if (event.songId) return songById.get(event.songId)?.youtubeId ?? null
      return null
    }
  }
}
