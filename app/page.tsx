import { Timeline } from '@/components/Timeline'
import { events } from '@/data/timeline'

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <Timeline events={events} />
    </main>
  )
}
