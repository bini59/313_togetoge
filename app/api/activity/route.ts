import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { events } from '@/data/timeline'

const validEventIds = new Set(events.map((e) => e.id))

export async function GET() {
  const sb = getServerClient()

  const [commentsRes, participationsRes] = await Promise.all([
    sb
      .from('comments')
      .select('id, event_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    sb
      .from('participation_counts')
      .select('event_id, count')
      .order('count', { ascending: false })
      .limit(10),
  ])

  if (commentsRes.error) {
    return NextResponse.json({ error: commentsRes.error.message }, { status: 500 })
  }
  if (participationsRes.error) {
    return NextResponse.json({ error: participationsRes.error.message }, { status: 500 })
  }

  const recentComments = (commentsRes.data ?? []).filter((c) =>
    validEventIds.has(c.event_id),
  )
  const topParticipated = (participationsRes.data ?? []).filter((p) =>
    validEventIds.has(p.event_id),
  )

  return NextResponse.json({ recentComments, topParticipated })
}
