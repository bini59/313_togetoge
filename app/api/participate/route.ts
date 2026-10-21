import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { participate, participatedEventIds, participationCounts } from '@/lib/db/queries'
import { getOrCreateClientId } from '@/lib/clientId'
import { events } from '@/data/timeline'

const validEventIds = new Set(events.map((e) => e.id))

export async function POST(req: Request) {
  const { eventId } = (await req.json().catch(() => ({}))) as { eventId?: string }
  if (!eventId || !validEventIds.has(eventId)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }

  const clientId = await getOrCreateClientId()
  try {
    return NextResponse.json(await participate(await getDB(), eventId, clientId))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function GET() {
  const clientId = await getOrCreateClientId()
  try {
    const db = await getDB()
    const [rows, participated] = await Promise.all([
      participationCounts(db),
      participatedEventIds(db, clientId),
    ])
    const counts: Record<string, number> = {}
    for (const row of rows) counts[row.event_id] = row.count
    return NextResponse.json({ counts, participated })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
