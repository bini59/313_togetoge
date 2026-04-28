'use client'
import { useEffect, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { usePlayback } from '@/lib/store'
import { EventCard } from './EventCard'
import { Player } from './Player'

interface Props {
  events: TimelineEvent[]
}

export function Timeline({ events }: Props) {
  const { currentEventId, setCurrent, play, pause, isPlaying } = usePlayback()
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/participate')
      .then((r) => r.json())
      .then((j) => setCounts(j.counts ?? {}))
      .catch(() => {})
  }, [])

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
    <div className="grid lg:grid-cols-[1fr_minmax(320px,420px)] gap-6 p-6">
      <section className="relative">
        <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[var(--color-bg)]/90 backdrop-blur border-b border-white/10 flex gap-2">
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
              onClick={() => { setCurrent(null); pause() }}
              className="px-4 py-2 text-sm rounded bg-white/5 hover:bg-white/10 text-[var(--color-muted)]"
            >
              초기화
            </button>
          )}
        </div>

        <div className="mt-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              participationCount={counts[event.id] ?? 0}
            />
          ))}
        </div>
      </section>

      <aside className="relative">
        <div className="sticky top-20">
          <Player events={events} onEnded={advanceToNext} />
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            영상이 끝나면 자동으로 다음 이벤트로 진행됩니다.
          </p>
        </div>
      </aside>
    </div>
  )
}
