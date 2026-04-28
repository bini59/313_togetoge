'use client'
import { create } from 'zustand'

interface PlaybackState {
  sessionSeed: string
  currentEventId: string | null
  isPlaying: boolean
  /** Window during which IntersectionObserver should ignore programmatic scrolls. */
  programmaticUntil: number
  setCurrent: (id: string | null) => void
  setCurrentFromScroll: (id: string) => void
  markProgrammaticScroll: (durationMs?: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
}

export const usePlayback = create<PlaybackState>((set, get) => ({
  sessionSeed: typeof window === 'undefined' ? '' : String(Date.now()),
  currentEventId: null,
  isPlaying: false,
  programmaticUntil: 0,
  setCurrent: (id) => {
    set({ currentEventId: id, programmaticUntil: Date.now() + 800 })
  },
  setCurrentFromScroll: (id) => {
    if (Date.now() < get().programmaticUntil) return
    if (get().currentEventId === id) return
    set({ currentEventId: id })
  },
  markProgrammaticScroll: (durationMs = 800) => {
    set({ programmaticUntil: Date.now() + durationMs })
  },
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
}))
