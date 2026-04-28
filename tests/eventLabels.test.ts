import { describe, expect, it } from 'vitest'
import { PARTICIPATE_LABEL, TYPE_COLOR, TYPE_LABEL } from '@/lib/eventLabels'

const ALL_TYPES = [
  'live', 'fes', 'album', 'youtube', 'new_song', 'radio', 'bd', 'tva', 'movie',
] as const

describe('event label maps', () => {
  it('every EventType has labels and colors', () => {
    for (const t of ALL_TYPES) {
      expect(PARTICIPATE_LABEL[t]).toBeTruthy()
      expect(TYPE_LABEL[t]).toBeTruthy()
      expect(TYPE_COLOR[t]).toBeTruthy()
    }
  })
})
