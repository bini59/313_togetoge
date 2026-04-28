'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/eventLabels'
import { usePlayback } from '@/lib/store'
import { Player } from './Player'
import { ParticipateButton } from './ParticipateButton'
import { Comments } from './Comments'

interface Props {
  events: TimelineEvent[]
}

const ITEM_WIDTH = 160
const STEM_BASE = 90
const STEM_STEP = 32

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
  const [playerOpen, setPlayerOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
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

  const activeIndex = useMemo(
    () => events.findIndex((e) => e.id === currentEventId),
    [events, currentEventId],
  )
  const activeEvent = activeIndex >= 0 ? events[activeIndex] : null

  useEffect(() => {
    if (!activeEvent) return
    const el = itemRefs.current.get(activeEvent.id)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeEvent])

  function startFromBeginning() {
    if (events.length === 0) return
    setCurrent(events[0].id)
    play()
    setPlayerOpen(true)
  }

  function advanceToNext(currentId: string) {
    const idx = events.findIndex((e) => e.id === currentId)
    if (idx >= 0 && idx + 1 < events.length) {
      setCurrent(events[idx + 1].id)
    } else {
      pause()
    }
  }

  const playheadX =
    activeIndex >= 0 ? activeIndex * ITEM_WIDTH + ITEM_WIDTH / 2 : -9999

  const focusMode = isPlaying && !!activeEvent

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
            <div className="mt-6 flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
              <span>{activeIndex + 1}</span>
              <span className="flex-1 h-px bg-white/15" />
              <span>{events.length}</span>
            </div>
          </div>
        </div>
      )}

      <div
        ref={stripRef}
        className={`absolute left-0 right-0 overflow-x-auto overflow-y-hidden flex items-center transition-all duration-500 ease-out ${
          focusMode ? 'top-[68%] bottom-0' : 'top-0 bottom-0'
        }`}
      >
        <div
          className="relative shrink-0"
          style={{
            width: events.length * ITEM_WIDTH,
            height: '100%',
          }}
        >
          <div
            className="absolute left-0 right-0 top-1/2 h-px bg-white/15"
          />

          <div
            className={`absolute z-10 top-1/2 -translate-y-1/2 transition-all duration-700 ease-out ${
              isPlaying ? 'animate-pulse' : ''
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
                  setPlayerOpen(true)
                }}
                className="absolute top-0 h-full text-left group"
                style={{
                  left: i * ITEM_WIDTH,
                  width: ITEM_WIDTH,
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
                    className={`-translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all ${
                      isActive
                        ? 'bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/25'
                        : 'bg-white/55 group-hover:bg-white'
                    }`}
                  />
                  <div
                    className={`absolute left-3 whitespace-nowrap transition-opacity duration-300 ${
                      focusMode && !isActive ? 'opacity-0' : 'opacity-100'
                    } ${stemUp ? '-top-1' : 'top-1/2 -translate-y-1/2'}`}
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
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute top-6 left-6 z-20">
        <h1 className="text-sm font-semibold tracking-[0.3em] text-white/70">
          GIRLS BAND CRY
        </h1>
        <p className="text-[10px] tracking-widest text-[var(--color-muted)] mt-0.5">
          CHRONICLE
        </p>
      </div>

      <div className="absolute bottom-6 left-6 z-20 flex gap-2">
        {currentEventId === null ? (
          <button
            onClick={startFromBeginning}
            className="px-3 py-1.5 text-xs rounded-full bg-[var(--color-accent)] hover:opacity-90"
          >
            ▶ 처음부터
          </button>
        ) : (
          <>
            <button
              onClick={() => (isPlaying ? pause() : play())}
              className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 backdrop-blur"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => {
                setCurrent(null)
                pause()
                setPlayerOpen(false)
                setDetailOpen(false)
              }}
              className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 text-[var(--color-muted)] backdrop-blur"
            >
              초기화
            </button>
          </>
        )}
        {activeEvent && (
          <button
            onClick={() => setDetailOpen((v) => !v)}
            className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 backdrop-blur"
          >
            {detailOpen ? '상세 닫기' : '상세 보기'}
          </button>
        )}
        {activeEvent && (
          <button
            onClick={() => setPlayerOpen((v) => !v)}
            className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 backdrop-blur"
          >
            {playerOpen ? '영상 숨기기' : '영상 보기'}
          </button>
        )}
      </div>

      {activeEvent && playerOpen && (
        <div className="absolute bottom-6 right-6 z-20 w-[280px] sm:w-[320px] rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-black/60 backdrop-blur">
          <Player events={events} onEnded={advanceToNext} />
        </div>
      )}

      {activeEvent && detailOpen && !focusMode && (
        <div className="absolute top-6 right-6 z-20 w-[320px] max-h-[70vh] overflow-y-auto rounded-lg border border-white/10 bg-black/70 backdrop-blur p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <time className="font-mono text-[var(--color-muted)]">
              {activeEvent.date}
            </time>
            <span
              className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${TYPE_COLOR[activeEvent.type]}`}
            >
              {TYPE_LABEL[activeEvent.type]}
            </span>
          </div>
          <h2 className="mt-1 text-base font-semibold">{activeEvent.title}</h2>
          {activeEvent.description && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {activeEvent.description}
            </p>
          )}
          <div className="mt-3">
            <ParticipateButton
              eventId={activeEvent.id}
              eventType={activeEvent.type}
              initialCount={counts[activeEvent.id] ?? 0}
              initialDone={participated.has(activeEvent.id)}
            />
          </div>
          <Comments eventId={activeEvent.id} />
        </div>
      )}
    </div>
  )
}
