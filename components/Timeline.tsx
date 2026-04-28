'use client'
import { useEffect, useRef, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { usePlayback } from '@/lib/store'
import { EventCard } from './EventCard'
import { Player } from './Player'

interface Props {
  events: TimelineEvent[]
}

export function Timeline({ events }: Props) {
  const {
    currentEventId,
    setCurrent,
    setCurrentFromScroll,
    play,
    pause,
    isPlaying,
  } = usePlayback()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [participated, setParticipated] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch('/api/participate')
      .then((r) => r.json())
      .then((j) => {
        setCounts(j.counts ?? {})
        setParticipated(new Set<string>(j.participated ?? []))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const cards = root.querySelectorAll<HTMLElement>('[data-event-id]')
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.getAttribute('data-event-id')
          if (!id) continue
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { id, ratio: entry.intersectionRatio }
          }
        }
        if (best) setCurrentFromScroll(best.id)
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0.1, 0.5, 1] },
    )
    cards.forEach((c) => observer.observe(c))
    return () => observer.disconnect()
  }, [events, setCurrentFromScroll])

  function startFromBeginning() {
    if (events.length === 0) return
    setCurrent(events[0].id)
    play()
  }

  function advanceToNext(currentId: string) {
    const idx = events.findIndex((e) => e.id === currentId)
    if (idx >= 0 && idx + 1 < events.length) {
      setCurrent(events[idx + 1].id)
    } else {
      pause()
    }
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <section className="relative order-2 lg:order-1">
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[var(--color-bg)]/90 backdrop-blur border-b border-white/10 flex gap-2">
          {currentEventId === null ? (
            <button
              onClick={startFromBeginning}
              className="px-4 py-2 text-sm rounded bg-[var(--color-accent)]"
            >
              ▶ 처음부터 재생
            </button>
          ) : (
            <button
              onClick={() => (isPlaying ? pause() : play())}
              className="px-4 py-2 text-sm rounded bg-white/10 hover:bg-white/20"
            >
              {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
            </button>
          )}
          {currentEventId && (
            <button
              onClick={() => {
                setCurrent(null)
                pause()
              }}
              className="px-4 py-2 text-sm rounded bg-white/5 hover:bg-white/10 text-[var(--color-muted)]"
            >
              초기화
            </button>
          )}
        </div>

        <div ref={listRef} className="mt-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              participationCount={counts[event.id] ?? 0}
              alreadyParticipated={participated.has(event.id)}
            />
          ))}
        </div>
      </section>

      <aside className="relative order-1 lg:order-2">
        <div className="lg:sticky lg:top-20">
          <Player events={events} onEnded={advanceToNext} />
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            영상이 끝나면 자동으로 다음 이벤트로 진행됩니다. 스크롤만 해도 해당 이벤트의 영상이 재생됩니다.
          </p>
        </div>
      </aside>
    </div>
  )
}
