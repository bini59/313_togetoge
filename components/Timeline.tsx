'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { TYPE_COLOR, TYPE_LABEL, TYPE_TINT } from '@/lib/eventLabels'
import { resolveYoutubeId } from '@/lib/songMatcher'
import { usePlayback } from '@/lib/store'
import { Player } from './Player'
import { ParticipateButton } from './ParticipateButton'
import { ActivityPanel } from './ActivityPanel'
import { CommentsScattered } from './CommentsScattered'

interface Props {
  events: TimelineEvent[]
}

const ITEM_WIDTH_VIDEO = 160
const ITEM_WIDTH_NO_VIDEO = 80
const STEM_BASE = 90
const STEM_STEP = 32
const SECTION_MS_WITH_VIDEO = 10_000
const SECTION_MS_NO_VIDEO = 5_000

export function Timeline({ events }: Props) {
  const {
    currentEventId,
    setCurrent,
    play,
    pause,
    isPlaying,
  } = usePlayback()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [participated, setParticipated] = useState<Set<string>>(new Set())
  const [playerOpen, setPlayerOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('gbc_player_open') !== '0'
  })
  const [cinemaMode, setCinemaMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('gbc_cinema') === '1'
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('gbc_player_open', playerOpen ? '1' : '0')
  }, [playerOpen])
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('gbc_cinema', cinemaMode ? '1' : '0')
  }, [cinemaMode])
  const [yearSlate, setYearSlate] = useState<string | null>(null)
  const prevYearRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [progress, setProgress] = useState(0)
  const stripRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    fetch('/api/participate')
      .then((r) => r.json())
      .then((j) => {
        setCounts(j.counts ?? {})
        setParticipated(new Set<string>(j.participated ?? []))
      })
      .catch(() => {})
  }, [])

  const slots = useMemo(() => {
    let x = 0
    return events.map((e) => {
      const hasVideo = resolveYoutubeId(e) !== null
      const w = hasVideo ? ITEM_WIDTH_VIDEO : ITEM_WIDTH_NO_VIDEO
      const slot = { x, w, hasVideo, center: x + w / 2 }
      x += w
      return slot
    })
  }, [events])
  const totalWidth = slots.length
    ? slots[slots.length - 1].x + slots[slots.length - 1].w
    : 0

  const activeIndex = useMemo(
    () => events.findIndex((e) => e.id === currentEventId),
    [events, currentEventId],
  )
  const activeEvent = activeIndex >= 0 ? events[activeIndex] : null

  useEffect(() => {
    if (!activeEvent || isPlaying) return
    const el = itemRefs.current.get(activeEvent.id)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeEvent, isPlaying])

  // Cinematic transitions: year slate + whoosh on active event change
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
      const t = setTimeout(() => setYearSlate(null), 1700)
      return () => clearTimeout(t)
    }
    return
  }, [activeEvent?.id])

  useEffect(() => {
    if (!activeEvent || !cinemaMode) return
    if (typeof window === 'undefined') return
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
      osc.start(now)
      osc.stop(now + 0.65)
    } catch {
      // autoplay policy may block until first gesture; ignore
    }
  }, [activeEvent?.id, cinemaMode])

  function advanceToNext(currentId: string) {
    const idx = events.findIndex((e) => e.id === currentId)
    if (idx >= 0 && idx + 1 < events.length) {
      setCurrent(events[idx + 1].id)
    } else {
      pause()
    }
  }

  useEffect(() => {
    if (!isPlaying || !activeEvent) {
      setProgress(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const hasVideo = resolveYoutubeId(activeEvent) !== null
    const sectionMs = hasVideo ? SECTION_MS_WITH_VIDEO : SECTION_MS_NO_VIDEO
    const tick = (t: number) => {
      const p = Math.min((t - start) / sectionMs, 1)
      setProgress(p)

      const strip = stripRef.current
      const fromSlot = slots[activeIndex]
      const toSlot = slots[activeIndex + 1] ?? fromSlot
      if (strip && fromSlot) {
        const headX = fromSlot.center + (toSlot.center - fromSlot.center) * p
        const target = headX - strip.clientWidth / 2
        const max = strip.scrollWidth - strip.clientWidth
        const clamped = Math.max(0, Math.min(target, max))
        strip.scrollLeft += (clamped - strip.scrollLeft) * 0.15
      }

      if (p >= 1) {
        advanceToNext(activeEvent.id)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // advanceToNext intentionally omitted, stable closure per active event
  }, [isPlaying, activeEvent?.id, events])

  const playheadX = (() => {
    const from = slots[activeIndex]
    if (!from) return -9999
    const to = slots[activeIndex + 1] ?? from
    return from.center + (isPlaying ? progress * (to.center - from.center) : 0)
  })()

  const focusMode = !!activeEvent
  const sceneTint = activeEvent ? TYPE_TINT[activeEvent.type] : '255, 59, 107'

  return (
    <div className="relative h-full w-full">
      <div
        className="cinema-backdrop"
        style={{ ['--scene-tint' as string]: sceneTint }}
      />
      {cinemaMode && <div className="cinema-vignette" />}
      {cinemaMode && <div className="cinema-grain" />}
      {cinemaMode && (
        <>
          <div
            className="cinema-letterbox top-0"
            style={{ ['--lb-origin' as string]: 'top' }}
            data-on={focusMode ? '1' : '0'}
          />
          <div
            className="cinema-letterbox bottom-0"
            style={{ ['--lb-origin' as string]: 'bottom' }}
            data-on={focusMode ? '1' : '0'}
          />
        </>
      )}
      {yearSlate && (
        <div key={yearSlate} className="year-slate">
          {yearSlate}
        </div>
      )}

      {focusMode && activeEvent && (
        <div
          key={activeEvent.id}
          className="absolute left-0 right-0 top-0 h-[68%] z-10 flex items-center justify-center px-8 sm:px-16 pointer-events-none"
          style={{ animation: 'dissolveIn 900ms cubic-bezier(0.2, 0.7, 0.2, 1) both' }}
        >
          <div className="max-w-3xl w-full">
            <div
              className="flex items-center gap-3 text-xs"
              style={{ animation: 'subtitleIn 700ms ease-out 200ms both' }}
            >
              <span
                className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-[0.2em] ${TYPE_COLOR[activeEvent.type]}`}
              >
                {TYPE_LABEL[activeEvent.type]}
              </span>
              <time
                className="text-[var(--color-muted)] tracking-[0.3em]"
                style={{ fontFamily: 'var(--font-serif-kr)' }}
              >
                {activeEvent.date}
              </time>
            </div>
            <h2
              className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]"
              style={{ fontFamily: 'var(--font-serif-kr)' }}
            >
              {activeEvent.title}
            </h2>
            {activeEvent.description && (
              <p
                className="mt-5 text-sm sm:text-base text-white/75 leading-relaxed max-w-2xl"
                style={{ animation: 'subtitleIn 800ms ease-out 350ms both' }}
              >
                {activeEvent.description}
              </p>
            )}
            <div className="mt-5 pointer-events-auto">
              <ParticipateButton
                eventId={activeEvent.id}
                eventType={activeEvent.type}
                initialCount={counts[activeEvent.id] ?? 0}
                initialDone={participated.has(activeEvent.id)}
              />
            </div>
            <div className="mt-6 flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
              <span>{activeIndex + 1}</span>
              <span className="flex-1 h-px bg-white/25" />
              <span>{events.length}</span>
            </div>
          </div>
        </div>
      )}

      {focusMode && activeEvent && (
        <CommentsScattered key={activeEvent.id} eventId={activeEvent.id} />
      )}

      <div
        ref={stripRef}
        className={`no-scrollbar absolute left-0 right-0 z-[2] overflow-x-auto overflow-y-hidden flex items-center transition-all duration-500 ease-out ${
          focusMode ? 'top-[68%] bottom-0' : 'top-0 bottom-0'
        }`}
      >
        <div
          className="relative shrink-0"
          style={{
            width: totalWidth,
            height: '100%',
          }}
        >
          <div
            className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-px bg-white/30"
          />
          <div
            className="absolute left-0 top-1/2 h-[2px] -translate-y-px bg-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent)]"
            style={{
              width: Math.max(0, playheadX),
              opacity: activeIndex >= 0 ? 1 : 0,
            }}
          />

          <div
            className={`absolute z-10 top-1/2 -translate-y-1/2 ${
              isPlaying ? '' : 'transition-all duration-500 ease-out'
            }`}
            style={{
              left: playheadX - 7,
              width: 14,
              height: 14,
              opacity: activeIndex >= 0 ? 1 : 0,
            }}
          >
            <div className="w-full h-full rounded-full bg-[var(--color-accent)] shadow-[0_0_16px_var(--color-accent)]" />
          </div>

          {events.map((event, i) => {
            const slot = slots[i]
            const baseStem = STEM_BASE + (i % 4) * STEM_STEP
            const stemHeight = focusMode ? 24 + (i % 3) * 8 : baseStem
            const stemUp = i % 2 === 0
            const isActive = event.id === currentEventId
            return (
              <button
                key={event.id}
                data-event-id={event.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(event.id, el)
                  else itemRefs.current.delete(event.id)
                }}
                onClick={() => {
                  setCurrent(event.id)
                  play()
                }}
                className="absolute top-0 h-full text-left group"
                style={{
                  left: slot.x,
                  width: slot.w,
                }}
              >
                <div
                  className={`absolute left-1/2 -translate-x-1/2 border-l-2 transition-colors ${
                    isActive
                      ? 'border-[var(--color-accent)]/80'
                      : 'border-white/30 group-hover:border-white/55'
                  }`}
                  style={{
                    top: stemUp ? `calc(50% - ${stemHeight}px)` : '50%',
                    height: stemHeight,
                  }}
                />

                <div
                  className="absolute left-1/2"
                  style={{
                    top: stemUp
                      ? `calc(50% - ${stemHeight}px - 3px)`
                      : `calc(50% + ${stemHeight}px - 3px)`,
                  }}
                >
                  <div
                    style={isActive ? { animation: 'lensPulse 2.4s ease-in-out infinite' } : undefined}
                    className={`-translate-x-1/2 rounded-full transition-all ${
                      isActive
                        ? 'bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/30 w-2 h-2'
                        : (counts[event.id] ?? 0) > 0
                          ? 'bg-[var(--color-accent)]/85 w-2 h-2'
                          : 'bg-white/70 group-hover:bg-white w-2 h-2'
                    }`}
                  />
                  <div
                    className={`absolute left-3 whitespace-nowrap transition-opacity duration-300 ${
                      focusMode && !isActive ? 'opacity-0' : 'opacity-100'
                    } ${stemUp ? '-top-1 -translate-y-full' : 'top-1/2 -translate-y-1/2'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-px rounded border text-[9px] uppercase tracking-wider ${TYPE_COLOR[event.type]}`}
                      >
                        {TYPE_LABEL[event.type]}
                      </span>
                      <time className="font-mono text-[10px] text-[var(--color-muted)]">
                        {event.date}
                      </time>
                    </div>
                    <div
                      className={`mt-0.5 text-xs font-medium truncate max-w-[200px] ${
                        isActive ? 'text-[var(--color-fg)]' : 'text-white/80'
                      }`}
                    >
                      {event.title}
                    </div>
                    {(counts[event.id] ?? 0) > 0 && (
                      <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[var(--color-accent)]/90">
                        <span>♥</span>
                        <span className="font-mono">{counts[event.id]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute top-6 left-6 z-[45]">
        <h1 className="text-base font-semibold tracking-[0.25em] text-white/85">
          トゲナシトゲアリ
        </h1>
        <p className="text-[10px] tracking-widest text-[var(--color-muted)] mt-0.5">
          CHRONICLE
        </p>
      </div>

      {activeEvent && (
        <div className="absolute bottom-6 left-6 z-[45] flex gap-2">
          <button
            onClick={() => (isPlaying ? pause() : play())}
            className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 backdrop-blur"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => setPlayerOpen((v) => !v)}
            className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 backdrop-blur"
          >
            {playerOpen ? '영상 숨기기' : '영상 보기'}
          </button>
          <button
            onClick={() => setCinemaMode((v) => !v)}
            className={`px-3 py-1.5 text-xs rounded-full backdrop-blur ${
              cinemaMode
                ? 'bg-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/40'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            시네마 {cinemaMode ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {activeEvent && (
        <div
          className={`absolute bottom-6 right-6 z-[45] w-[280px] sm:w-[320px] rounded-lg overflow-hidden shadow-2xl border border-white/20 bg-black/60 backdrop-blur transition-opacity ${
            playerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!playerOpen}
        >
          <Player events={events} />
        </div>
      )}

      <ActivityPanel events={events} />
    </div>
  )
}
