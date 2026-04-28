'use client'
import { useEffect, useState } from 'react'
import type { CommentRow } from '@/lib/types'

interface Props {
  eventId: string
}

export function Comments({ eventId }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    fetch(`/api/comments?eventId=${encodeURIComponent(eventId)}`)
      .then((r) => r.json())
      .then((j) => { if (!cancel) setComments(j.comments ?? []) })
      .catch(() => {})
    return () => { cancel = true }
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
    <div className="mt-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="익명 댓글 (작성 후 삭제 불가)"
          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-4 py-2 text-sm rounded bg-[var(--color-accent)] disabled:opacity-50"
        >
          남기기
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="text-sm border-l-2 border-white/10 pl-3">
            <p className="whitespace-pre-wrap">{c.content}</p>
            <time className="text-xs text-[var(--color-muted)]">
              {new Date(c.created_at).toLocaleString('ko-KR')}
            </time>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-xs text-[var(--color-muted)]">아직 댓글이 없습니다.</li>
        )}
      </ul>
    </div>
  )
}
