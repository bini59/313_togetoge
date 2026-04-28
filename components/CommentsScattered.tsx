'use client'
import { useEffect, useState } from 'react'
import type { CommentRow } from '@/lib/types'

interface Props {
  eventId: string
}

const NOTE_COLORS = [
  'bg-[#fef3c7]',
  'bg-[#fce7f3]',
  'bg-[#dbeafe]',
  'bg-[#dcfce7]',
  'bg-[#ede9fe]',
  'bg-[#ffe4e6]',
  'bg-[#fef9c3]',
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

interface NotePos {
  left: string
  top: string
  width: number
  rotate: number
  color: string
  delay: number
}

function noteStyle(id: string, idx: number): NotePos {
  const h = hashCode(id)
  // Two columns of safe zones: 1–30% and 58–95% to keep center hero readable.
  const leftSide = ((h >> 3) & 1) === 0
  const xBase = leftSide ? 1 + (h % 29) : 58 + (h % 37)
  const yBase = 3 + ((h >> 7) % 62)
  const rotate = ((h >> 13) % 13) - 6
  const width = 140 + ((h >> 17) % 90)
  const color = NOTE_COLORS[h % NOTE_COLORS.length]
  return {
    left: `${xBase}%`,
    top: `${yBase}%`,
    width,
    rotate,
    color,
    delay: Math.min(idx, 20) * 50,
  }
}

export function CommentsScattered({ eventId }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    fetch(`/api/comments?eventId=${encodeURIComponent(eventId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancel) setComments(j.comments ?? [])
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [eventId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId, content: trimmed }),
      })
      const json = await res.json()
      if (res.ok && json.comment) {
        setComments((prev) => [json.comment, ...prev])
        setText('')
      } else {
        setError(json.error ?? '전송 실패')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {comments.slice(0, 50).map((c, i) => {
        const s = noteStyle(c.id, i)
        return (
          <div
            key={c.id}
            className={`absolute pointer-events-auto px-3 py-2 rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.35)] text-stone-900 ${s.color}`}
            style={{
              left: s.left,
              top: s.top,
              width: s.width,
              ['--note-rot' as string]: `${s.rotate}deg`,
              transform: `rotate(${s.rotate}deg)`,
              animation: `stickyIn 380ms ease-out ${s.delay}ms both`,
            }}
          >
            <p className="whitespace-pre-wrap break-words leading-snug text-[12px]">
              {c.content}
            </p>
            <time className="block mt-1 text-[9px] text-stone-500 font-mono">
              {new Date(c.created_at).toLocaleDateString('ko-KR')}
            </time>
          </div>
        )
      })}

      <form
        onSubmit={submit}
        className="absolute bottom-[34%] left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 bg-black/70 backdrop-blur px-2 py-1.5 rounded-full border border-white/15 shadow-xl"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="롤링페이퍼에 한 줄 남기기..."
          className="bg-transparent px-3 text-sm w-[260px] sm:w-[320px] focus:outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-3 py-1 text-xs rounded-full bg-[var(--color-accent)] disabled:opacity-50"
        >
          붙이기
        </button>
        {error && (
          <span className="text-[10px] text-rose-400 px-1" role="alert">
            {error}
          </span>
        )}
      </form>
    </div>
  )
}
