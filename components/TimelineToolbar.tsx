'use client'
import type { TimelineEvent } from '@/lib/types'
import { Player } from './Player'

interface Props {
  activeEvent: TimelineEvent
  events: TimelineEvent[]
  isPlaying: boolean
  playerOpen: boolean
  cinemaMode: boolean
  onPlayToggle: () => void
  onPlayerToggle: () => void
  onCinemaToggle: () => void
}

export function TimelineToolbar({
  activeEvent: _activeEvent,
  events,
  isPlaying,
  playerOpen,
  cinemaMode,
  onPlayToggle,
  onPlayerToggle,
  onCinemaToggle,
}: Props) {
  // In cinema mode the bg video acts as the player surface, so the corner
  // player is hidden to avoid duplicate iframes.
  const showCornerPlayer = playerOpen && !cinemaMode
  const showCornerSlot = !cinemaMode

  return (
    <>
      <div className="absolute bottom-6 left-6 z-[var(--z-chrome)] flex gap-2">
        <button
          onClick={onPlayToggle}
          className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 backdrop-blur"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={onPlayerToggle}
          className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 backdrop-blur"
        >
          {playerOpen ? '영상 숨기기' : '영상 보기'}
        </button>
        <button
          onClick={onCinemaToggle}
          className={`px-3 py-1.5 text-xs rounded-full backdrop-blur ${
            cinemaMode
              ? 'bg-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/40'
              : 'bg-white/5 hover:bg-white/10'
          }`}
          aria-pressed={cinemaMode}
        >
          시네마 {cinemaMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {showCornerSlot && (
        <div
          className={`absolute bottom-6 right-6 z-[var(--z-chrome)] w-[280px] sm:w-[320px] rounded-lg overflow-hidden shadow-2xl border border-white/20 bg-black/60 backdrop-blur transition-opacity ${
            showCornerPlayer ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!showCornerPlayer}
        >
          {showCornerPlayer && <Player events={events} />}
        </div>
      )}
    </>
  )
}
