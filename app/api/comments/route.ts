import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
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
  const sb = getServerClient()
  const { data, error } = await sb
    .from('comments')
    .select('id, event_id, content, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(req: Request) {
  const { eventId, content } = (await req.json().catch(() => ({}))) as {
    eventId?: string
    content?: string
  }
  if (!eventId || !validEventIds.has(eventId)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }
  const trimmed = (content ?? '').trim()
  if (trimmed.length < 1 || trimmed.length > 500) {
    return NextResponse.json({ error: 'content length 1..500' }, { status: 400 })
  }

  const clientId = await getOrCreateClientId()
  const sb = getServerClient()

  const decision = await checkCommentRate(sb, clientId)
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

  const { data, error } = await sb
    .from('comments')
    .insert({ event_id: eventId, content: trimmed, client_id: clientId })
    .select('id, event_id, content, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
