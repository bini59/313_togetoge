import { Timeline } from '@/components/Timeline'
import { events } from '@/data/timeline'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="px-6 py-10 border-b border-white/10">
        <h1 className="text-3xl font-bold tracking-tight">
          GIRLS BAND CRY <span className="text-[var(--color-accent)]">— 연대기</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          시간순으로 자동 재생되는 인터랙티브 타임라인. 이벤트별 영상이 자동 재생되며,
          각 항목에 참여하거나 익명 댓글을 남길 수 있습니다.
        </p>
      </header>
      <Timeline events={events} />
    </main>
  )
}
