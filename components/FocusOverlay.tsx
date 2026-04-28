'use client'
import type { TimelineEvent } from '@/lib/types'
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/eventLabels'
import { ParticipateButton } from './ParticipateButton'

interface Props {
  activeEvent: TimelineEvent
  activeIndex: number
  totalEvents: number
  count: number
  alreadyParticipated: boolean
}

export function FocusOverlay({
  activeEvent,
  activeIndex,
  totalEvents,
  count,
  alreadyParticipated,
}: Props) {
  return (
    <div
      key={activeEvent.id}
      className="absolute left-0 right-0 top-0 h-[68%] z-[10] flex items-center justify-center px-8 sm:px-16 pointer-events-none anim-dissolve"
    >
      <div className="max-w-3xl w-full">
        <div className="flex items-center gap-3 text-xs anim-subtitle">
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
          <p className="mt-5 text-sm sm:text-base text-white/75 leading-relaxed max-w-2xl anim-subtitle-late">
            {activeEvent.description}
          </p>
        )}
        <div className="mt-5 pointer-events-auto">
          <ParticipateButton
            eventId={activeEvent.id}
            eventType={activeEvent.type}
            initialCount={count}
            initialDone={alreadyParticipated}
          />
        </div>
        <div className="mt-6 flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
          <span>{activeIndex + 1}</span>
          <span className="flex-1 h-px bg-white/25" />
          <span>{totalEvents}</span>
        </div>
      </div>
    </div>
  )
}
