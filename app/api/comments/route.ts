import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
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
  const sb = getServerClient()
  const { data, error } = await sb
    .from('comments')
    .insert({ event_id: eventId, content: trimmed })
    .select('id, event_id, content, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
