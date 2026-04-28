'use client'
import { useEffect, useRef } from 'react'
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/eventLabels'
import { usePlayback } from '@/lib/store'
import type { TimelineEvent } from '@/lib/types'
import { ParticipateButton } from './ParticipateButton'
import { Comments } from './Comments'

interface Props {
  event: TimelineEvent
  participationCount: number
  alreadyParticipated?: boolean
}

export function EventCard({ event, participationCount, alreadyParticipated }: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const { currentEventId, setCurrent, play } = usePlayback()
  const isActive = currentEventId === event.id

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isActive])

  return (
    <article
      ref={ref}
      data-event-id={event.id}
      className={`relative pl-8 pr-4 py-6 border-l-2 transition-colors ${
        isActive ? 'border-[var(--color-accent)] bg-white/5' : 'border-white/10'
      }`}
    >
      <span
        className={`absolute -left-2 top-7 w-3 h-3 rounded-full ${
          isActive ? 'bg-[var(--color-accent)]' : 'bg-white/30'
        }`}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <time className="font-mono text-[var(--color-muted)]">{event.date}</time>
        <span
          className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${
            TYPE_COLOR[event.type]
          }`}
        >
          {TYPE_LABEL[event.type]}
        </span>
      </div>
      <h2 className="mt-1 text-lg font-semibold">{event.title}</h2>
      {event.description && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">{event.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => { setCurrent(event.id); play() }}
          className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20"
        >
          ▶ 이 시점부터 재생
        </button>
        <ParticipateButton
          eventId={event.id}
          eventType={event.type}
          initialCount={participationCount}
          initialDone={alreadyParticipated ?? false}
        />
      </div>

      {isActive && <Comments eventId={event.id} />}
    </article>
  )
}
