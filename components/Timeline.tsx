'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/eventLabels'
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

  return (
    <div className="relative h-full w-full">
      {focusMode && activeEvent && (
        <div className="absolute left-0 right-0 top-0 h-[68%] z-10 flex items-center justify-center px-8 sm:px-16 pointer-events-none animate-[fadeIn_400ms_ease-out]">
          <div className="max-w-3xl w-full">
            <div className="flex items-center gap-3 text-xs">
              <span
                className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-[0.2em] ${TYPE_COLOR[activeEvent.type]}`}
              >
                {TYPE_LABEL[activeEvent.type]}
              </span>
              <time className="font-mono text-[var(--color-muted)] tracking-wider">
                {activeEvent.date}
              </time>
            </div>
            <h2 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              {activeEvent.title}
            </h2>
            {activeEvent.description && (
              <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl">
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
              <span className="flex-1 h-px bg-white/15" />
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
        className={`no-scrollbar absolute left-0 right-0 overflow-x-auto overflow-y-hidden flex items-center transition-all duration-500 ease-out ${
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
            className="absolute left-0 right-0 top-1/2 h-px bg-white/15"
          />
          <div
            className="absolute left-0 top-1/2 h-px bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]"
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
                  className={`absolute left-1/2 -translate-x-1/2 border-l border-dashed transition-colors ${
                    isActive
                      ? 'border-[var(--color-accent)]/70'
                      : 'border-white/20 group-hover:border-white/45'
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
                    className={`-translate-x-1/2 rounded-full transition-all ${
                      isActive
                        ? 'bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/25 w-1.5 h-1.5'
                        : (counts[event.id] ?? 0) > 0
                          ? 'bg-[var(--color-accent)]/80 w-2 h-2'
                          : 'bg-white/55 group-hover:bg-white w-1.5 h-1.5'
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

      <div className="pointer-events-none absolute top-6 left-6 z-20">
        <h1 className="text-base font-semibold tracking-[0.25em] text-white/85">
          トゲナシトゲアリ
        </h1>
        <p className="text-[10px] tracking-widest text-[var(--color-muted)] mt-0.5">
          CHRONICLE
        </p>
      </div>

      {currentEventId !== null && (
        <div className="absolute bottom-6 left-6 z-20">
          <button
            onClick={() => {
              setCurrent(null)
              pause()
            }}
            className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 text-[var(--color-muted)] backdrop-blur"
          >
            초기화
          </button>
        </div>
      )}

      {activeEvent && (
        <div
          className="absolute bottom-6 right-6 z-20 w-[280px] sm:w-[320px] rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-black/60 backdrop-blur"
        >
          <Player events={events} />
        </div>
      )}

      <ActivityPanel events={events} />
    </div>
  )
}
