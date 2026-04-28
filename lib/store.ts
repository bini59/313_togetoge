'use client'
import { create } from 'zustand'

interface VideoProgress {
  time: number
  duration: number
}

interface PlaybackState {
  sessionSeed: string
  currentEventId: string | null
  isPlaying: boolean
  /** Window during which IntersectionObserver should ignore programmatic scrolls. */
  programmaticUntil: number
  videoProgress: Record<string, VideoProgress>
  setCurrent: (id: string | null) => void
  setCurrentFromScroll: (id: string) => void
  markProgrammaticScroll: (durationMs?: number) => void
  recordProgress: (videoId: string, time: number, duration: number) => void
  consumeStartTime: (videoId: string) => number
  play: () => void
  pause: () => void
  toggle: () => void
}

const RESTART_THRESHOLD_SEC = 20

export const usePlayback = create<PlaybackState>((set, get) => ({
  // Stable across SSR + initial CSR render to avoid hydration mismatch.
  // The sessionSeed only affects which YouTube id is picked from a setlist,
  // and that selection happens after first user interaction.
  sessionSeed: 'gbc',
  currentEventId: null,
  isPlaying: false,
  programmaticUntil: 0,
  videoProgress: {},
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
  recordProgress: (videoId, time, duration) => {
    if (!videoId || !Number.isFinite(time) || time < 0) return
    set((s) => ({
      videoProgress: {
        ...s.videoProgress,
        [videoId]: {
          time,
          duration: Number.isFinite(duration) && duration > 0 ? duration : (s.videoProgress[videoId]?.duration ?? 0),
        },
      },
    }))
  },
  consumeStartTime: (videoId) => {
    const p = get().videoProgress[videoId]
    if (!p || p.duration <= 0) return 0
    const remaining = p.duration - p.time
    if (remaining <= RESTART_THRESHOLD_SEC) return 0
    return Math.floor(p.time)
  },
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
}))
