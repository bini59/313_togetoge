import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { insertComment, listCommentsForEvent } from '@/lib/db/queries'
import { getOrCreateClientId } from '@/lib/clientId'
import { checkCommentRate } from '@/lib/rateLimit'
import { events } from '@/data/timeline'

const validEventIds = new Set(events.map((e) => e.id))

export async function GET(req: Request) {
  const url = new URL(req.url)
  const eventId = url.searchParams.get('eventId')
  if (!eventId || !validEventIds.has(eventId)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }
  try {
    const comments = await listCommentsForEvent(await getDB(), eventId, 100)
    return NextResponse.json({ comments })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { eventId, content } = (await req.json().catch(() => ({}))) as {
    eventId?: string
    content?: string
  }
  if (!eventId || !validEventIds.has(eventId)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }
  const trimmed = (typeof content === 'string' ? content : '').trim()
  if (trimmed.length < 1 || trimmed.length > 500) {
    return NextResponse.json({ error: 'content length 1..500' }, { status: 400 })
  }

  const clientId = await getOrCreateClientId()
  const db = await getDB()

  const decision = await checkCommentRate(db, clientId)
  if (!decision.ok) {
    return NextResponse.json(
      {
        error: decision.reason === 'cooldown' ? '잠시 후 다시 시도해주세요.' : '시간당 댓글 한도에 도달했습니다.',
        retryAfterMs: decision.retryAfterMs,
      },
      {
        status: 429,
        headers: decision.retryAfterMs
          ? { 'Retry-After': String(Math.ceil(decision.retryAfterMs / 1000)) }
          : undefined,
      },
    )
  }

  try {
    const comment = await insertComment(db, { eventId, content: trimmed, clientId })
    return NextResponse.json({ comment })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
