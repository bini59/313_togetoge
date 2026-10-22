import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { listRecentComments, participationCounts } from '@/lib/db/queries'
import { events } from '@/data/timeline'

const validEventIds = new Set(events.map((e) => e.id))

export async function GET() {
  try {
    const db = await getDB()
    const [comments, counts] = await Promise.all([
      listRecentComments(db, 20),
      participationCounts(db, 10),
    ])
    return NextResponse.json({
      recentComments: comments.filter((c) => validEventIds.has(c.event_id)),
      topParticipated: counts.filter((p) => validEventIds.has(p.event_id)),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
