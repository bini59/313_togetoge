'use client'
import { create } from 'zustand'

interface PlaybackState {
  sessionSeed: string
  currentEventId: string | null
  isPlaying: boolean
  setCurrent: (id: string | null) => void
  play: () => void
  pause: () => void
  toggle: () => void
}

export const usePlayback = create<PlaybackState>((set) => ({
  sessionSeed: typeof window === 'undefined' ? '' : String(Date.now()),
  currentEventId: null,
  isPlaying: false,
  setCurrent: (id) => set({ currentEventId: id }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
}))
