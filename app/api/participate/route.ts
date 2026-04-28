import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { getOrCreateClientId } from '@/lib/clientId'
import { events } from '@/data/timeline'

const validEventIds = new Set(events.map((e) => e.id))

export async function POST(req: Request) {
  const { eventId } = (await req.json().catch(() => ({}))) as { eventId?: string }
  if (!eventId || !validEventIds.has(eventId)) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 })
  }

  const clientId = await getOrCreateClientId()
  const sb = getServerClient()

  const { error: insertErr } = await sb
    .from('participation_clients')
    .insert({ event_id: eventId, client_id: clientId })

  if (insertErr) {
    if (insertErr.code === '23505') {
      const { data } = await sb.from('participations').select('count').eq('event_id', eventId).single()
      return NextResponse.json({ count: data?.count ?? 0, alreadyParticipated: true })
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const { data: existing } = await sb
    .from('participations')
    .select('count')
    .eq('event_id', eventId)
    .maybeSingle()

  const newCount = (existing?.count ?? 0) + 1
  const { error: upsertErr } = await sb
    .from('participations')
    .upsert({ event_id: eventId, count: newCount })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ count: newCount, alreadyParticipated: false })
}

export async function GET() {
  const sb = getServerClient()
  const clientId = await getOrCreateClientId()

  const [countsRes, mineRes] = await Promise.all([
    sb.from('participations').select('event_id, count'),
    sb.from('participation_clients').select('event_id').eq('client_id', clientId),
  ])

  if (countsRes.error) {
    return NextResponse.json({ error: countsRes.error.message }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const row of countsRes.data ?? []) counts[row.event_id] = row.count

  const participated: string[] = (mineRes.data ?? []).map((r) => r.event_id)

  return NextResponse.json({ counts, participated })
}
