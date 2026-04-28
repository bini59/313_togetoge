'use client'
import { useEffect, useRef, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'

const YEAR_SLATE_MS = 1700

export function useCinemaEffects(activeEvent: TimelineEvent | null, cinemaMode: boolean) {
  const [yearSlate, setYearSlate] = useState<string | null>(null)
  const prevYearRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!activeEvent) {
      prevYearRef.current = null
      return
    }
    const year = activeEvent.date.slice(0, 4)
    const prev = prevYearRef.current
    prevYearRef.current = year
    if (prev !== null && prev !== year) {
      setYearSlate(year)
      const t = setTimeout(() => setYearSlate(null), YEAR_SLATE_MS)
      return () => clearTimeout(t)
    }
    return
  }, [activeEvent])

  useEffect(() => {
    if (!activeEvent || !cinemaMode || typeof window === 'undefined') return
    try {
      let ctx = audioCtxRef.current
      if (!ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        ctx = new Ctor()
        audioCtxRef.current = ctx
      }
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.6)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
      osc.connect(gain).connect(ctx.destination)
      osc.onended = () => {
        try {
          osc.disconnect()
          gain.disconnect()
        } catch {
          // already disconnected
        }
      }
      osc.start(now)
      osc.stop(now + 0.65)
    } catch {
      // autoplay policy may block until first gesture; ignore
    }
  }, [activeEvent, cinemaMode])

  useEffect(() => {
    return () => {
      const ctx = audioCtxRef.current
      audioCtxRef.current = null
      ctx?.close().catch(() => {})
    }
  }, [])

  return yearSlate
}
