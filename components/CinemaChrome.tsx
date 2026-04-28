'use client'
import type { TimelineEvent } from '@/lib/types'
import { Player } from './Player'

interface Props {
  cinemaMode: boolean
  focusMode: boolean
  sceneTint: string
  yearSlate: string | null
  activeEvent: TimelineEvent | null
  events: TimelineEvent[]
  showBgVideo: boolean
}

export function CinemaChrome({
  cinemaMode,
  focusMode,
  sceneTint,
  yearSlate,
  activeEvent,
  events,
  showBgVideo,
}: Props) {
  return (
    <>
      <div
        className="cinema-backdrop"
        style={{ ['--scene-tint' as string]: sceneTint }}
      />
      {cinemaMode && activeEvent && showBgVideo && (
        <div className="cinema-bg-video">
          <Player events={events} />
        </div>
      )}
      {cinemaMode && <div className="cinema-vignette" />}
      {cinemaMode && <div className="cinema-grain" />}
      {cinemaMode && (
        <>
          <div
            className="cinema-letterbox top-0"
            style={{ ['--lb-origin' as string]: 'top' }}
            data-on={focusMode ? '1' : '0'}
          />
          <div
            className="cinema-letterbox bottom-0"
            style={{ ['--lb-origin' as string]: 'bottom' }}
            data-on={focusMode ? '1' : '0'}
          />
        </>
      )}
      {yearSlate && (
        <div key={yearSlate} className="year-slate">
          {yearSlate}
        </div>
      )}
    </>
  )
}
