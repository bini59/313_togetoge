'use client'
import { useState } from 'react'
import { PARTICIPATE_LABEL } from '@/lib/eventLabels'
import type { EventType } from '@/lib/types'

interface Props {
  eventId: string
  eventType: EventType
  initialCount: number
  initialDone?: boolean
}

export function ParticipateButton({ eventId, eventType, initialCount, initialDone }: Props) {
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(initialDone ?? false)

  async function click() {
    if (pending || done) return
    setPending(true)
    try {
      const res = await fetch('/api/participate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const json = await res.json()
      if (typeof json.count === 'number') setCount(json.count)
      setDone(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={click}
      disabled={pending || done}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-white/15 hover:border-[var(--color-accent)] disabled:opacity-60"
    >
      <span>{PARTICIPATE_LABEL[eventType]}</span>
      <span className="font-mono text-[var(--color-accent)]">{count.toLocaleString()}</span>
      {done && <span className="text-[10px] text-[var(--color-muted)]">참여완료</span>}
    </button>
  )
}
