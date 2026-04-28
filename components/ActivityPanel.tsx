'use client'
import { useEffect, useMemo, useState } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/eventLabels'
import { usePlayback } from '@/lib/store'

interface RecentComment {
  id: string
  event_id: string
  content: string
  created_at: string
}

interface TopRow {
  event_id: string
  count: number
}

interface Props {
  events: TimelineEvent[]
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return `${d}일 전`
}

export function ActivityPanel({ events }: Props) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<RecentComment[]>([])
  const [top, setTop] = useState<TopRow[]>([])
  const { setCurrent, play } = usePlayback()

  useEffect(() => {
    let alive = true
    function load() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetch('/api/activity')
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return
          setRecent(j.recentComments ?? [])
          setTop(j.topParticipated ?? [])
        })
        .catch((err) => console.warn('activity load failed', err))
    }
    load()
    if (!open) return () => { alive = false }
    const id = setInterval(load, 20_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [open])

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const totalComments = recent.length
  const totalParticipations = top.reduce((s, r) => s + r.count, 0)

  return (
    <div className="absolute top-6 right-6 z-[45] flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center gap-2"
        aria-expanded={open}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
        </span>
        활동
        <span className="text-[10px] text-[var(--color-muted)]">
          {totalParticipations}참여 · {totalComments}댓글
        </span>
      </button>

      {open && (
        <div className="w-[320px] max-h-[70vh] overflow-y-auto rounded-lg border border-white/20 bg-black/75 backdrop-blur p-3 text-xs space-y-4 animate-[fadeIn_200ms_ease-out]">
          <section>
            <h3 className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-2">
              인기 이벤트
            </h3>
            {top.length === 0 ? (
              <p className="text-[var(--color-muted)]">아직 참여 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {top.slice(0, 5).map((row) => {
                  const e = eventById.get(row.event_id)
                  if (!e) return null
                  return (
                    <li key={row.event_id}>
                      <button
                        onClick={() => {
                          setCurrent(e.id)
                          play()
                        }}
                        className="w-full text-left flex items-center gap-2 hover:bg-white/5 rounded px-1.5 py-1"
                      >
                        <span
                          className={`px-1.5 py-px rounded border text-[9px] uppercase tracking-wider shrink-0 ${TYPE_COLOR[e.type]}`}
                        >
                          {TYPE_LABEL[e.type]}
                        </span>
                        <span className="truncate flex-1">{e.title}</span>
                        <span className="font-mono text-[var(--color-accent)] shrink-0">
                          {row.count}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-2">
              최근 댓글
            </h3>
            {recent.length === 0 ? (
              <p className="text-[var(--color-muted)]">아직 댓글이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {recent.slice(0, 8).map((c) => {
                  const e = eventById.get(c.event_id)
                  return (
                    <li key={c.id} className="bg-white/[0.04] hover:bg-white/[0.07] rounded-md px-2 py-1.5">
                      <button
                        onClick={() => {
                          if (!e) return
                          setCurrent(e.id)
                          play()
                        }}
                        className="text-left w-full"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                          <span className="truncate">
                            {e?.title ?? c.event_id}
                          </span>
                          <span className="shrink-0">·</span>
                          <span className="shrink-0">{relativeTime(c.created_at)}</span>
                        </div>
                        <p className="mt-0.5 text-white/85 line-clamp-2">
                          {c.content}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
