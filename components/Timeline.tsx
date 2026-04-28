'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { TYPE_COLOR, TYPE_LABEL, TYPE_TINT } from '@/lib/eventLabels'
import { resolveYoutubeId } from '@/lib/songMatcher'
import { usePlayback } from '@/lib/store'
import { useCinemaEffects } from '@/lib/hooks/useCinemaEffects'
import { usePlayheadAnimation } from '@/lib/hooks/usePlayheadAnimation'
import { ActivityPanel } from './ActivityPanel'
import { CinemaChrome } from './CinemaChrome'
import { CommentsScattered } from './CommentsScattered'
import { FocusOverlay } from './FocusOverlay'
import { TimelineToolbar } from './TimelineToolbar'

interface Props {
  events: TimelineEvent[]
}

const ITEM_WIDTH_VIDEO = 160
const ITEM_WIDTH_NO_VIDEO = 80
const STEM_BASE = 90
const STEM_STEP = 32
const SECTION_MS_WITH_VIDEO = 10_000
const SECTION_MS_NO_VIDEO = 5_000
const PLAYHEAD_HALF_WIDTH = 7

export function Timeline({ events }: Props) {
  const { currentEventId, setCurrent, play, pause, isPlaying } = usePlayback()
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

  const stripRef = useRef<HTMLDivElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const playheadRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('gbc_player_open', playerOpen ? '1' : '0')
  }, [playerOpen])
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('gbc_cinema', cinemaMode ? '1' : '0')
  }, [cinemaMode])

  useEffect(() => {
    fetch('/api/participate')
      .then((r) => r.json())
      .then((j) => {
        setCounts(j.counts ?? {})
        setParticipated(new Set<string>(j.participated ?? []))
      })
      .catch((err) => console.warn('participate load failed', err))
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

  const advanceToNext = useCallback(
    (currentId: string) => {
      const idx = events.findIndex((e) => e.id === currentId)
      if (idx >= 0 && idx + 1 < events.length) {
        setCurrent(events[idx + 1].id)
      } else {
        pause()
      }
    },
    [events, setCurrent, pause],
  )

  usePlayheadAnimation({
    isPlaying,
    activeEvent,
    activeIndex,
    slots,
    stripRef,
    progressBarRef,
    playheadRef,
    sectionMsWithVideo: SECTION_MS_WITH_VIDEO,
    sectionMsNoVideo: SECTION_MS_NO_VIDEO,
    onSectionEnd: advanceToNext,
  })

  const yearSlate = useCinemaEffects(activeEvent, cinemaMode)

  const focusMode = !!activeEvent
  const sceneTint = activeEvent ? TYPE_TINT[activeEvent.type] : '255, 59, 107'

  return (
    <div className="relative h-full w-full">
      <CinemaChrome
        cinemaMode={cinemaMode}
        focusMode={focusMode}
        sceneTint={sceneTint}
        yearSlate={yearSlate}
        activeEvent={activeEvent}
        events={events}
        showBgVideo={playerOpen}
      />

      {focusMode && activeEvent && (
        <FocusOverlay
          activeEvent={activeEvent}
          activeIndex={activeIndex}
          totalEvents={events.length}
          count={counts[activeEvent.id] ?? 0}
          alreadyParticipated={participated.has(activeEvent.id)}
        />
      )}

      {focusMode && activeEvent && (
        <CommentsScattered key={activeEvent.id} eventId={activeEvent.id} />
      )}

      <div
        ref={stripRef}
        className={`no-scrollbar absolute left-0 right-0 z-[var(--z-strip)] overflow-x-auto overflow-y-hidden flex items-center transition-all duration-500 ease-out ${
          focusMode ? 'top-[68%] bottom-0' : 'top-0 bottom-0'
        }`}
      >
        <div
          className="relative shrink-0"
          style={{ width: totalWidth, height: '100%' }}
        >
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-px bg-white/30" />
          <div
            ref={progressBarRef}
            className="absolute left-0 top-1/2 h-[2px] -translate-y-px bg-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent)] pointer-events-none"
            style={{ width: 0, opacity: 0 }}
          />
          <div
            ref={playheadRef}
            className={`absolute z-10 top-1/2 -translate-y-1/2 ${
              isPlaying ? '' : 'transition-[left] duration-500 ease-out'
            }`}
            style={{
              left: -PLAYHEAD_HALF_WIDTH,
              width: 14,
              height: 14,
              opacity: 0,
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
            const heartCount = counts[event.id] ?? 0
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
                style={{ left: slot.x, width: slot.w }}
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
                    className={`-translate-x-1/2 rounded-full transition-all w-2 h-2 ${
                      isActive
                        ? 'bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/30 anim-lens-pulse'
                        : heartCount > 0
                          ? 'bg-[var(--color-accent)]/85'
                          : 'bg-white/70 group-hover:bg-white'
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
                    {heartCount > 0 && (
                      <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[var(--color-accent)]/90">
                        <span>♥</span>
                        <span className="font-mono">{heartCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute top-6 left-6 z-[var(--z-chrome)]">
        <h1 className="text-base font-semibold tracking-[0.25em] text-white/85">
          トゲナシトゲアリ
        </h1>
        <p className="text-[10px] tracking-widest text-[var(--color-muted)] mt-0.5">
          CHRONICLE
        </p>
      </div>

      {activeEvent && (
        <TimelineToolbar
          activeEvent={activeEvent}
          events={events}
          isPlaying={isPlaying}
          playerOpen={playerOpen}
          cinemaMode={cinemaMode}
          onPlayToggle={() => (isPlaying ? pause() : play())}
          onPlayerToggle={() => setPlayerOpen((v) => !v)}
          onCinemaToggle={() => setCinemaMode((v) => !v)}
        />
      )}

      <ActivityPanel events={events} />
    </div>
  )
}
