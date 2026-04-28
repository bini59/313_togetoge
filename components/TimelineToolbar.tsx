'use client'

interface Props {
  isPlaying: boolean
  playerOpen: boolean
  onPlayToggle: () => void
  onPlayerToggle: () => void
}

export function TimelineToolbar({
  isPlaying,
  playerOpen,
  onPlayToggle,
  onPlayerToggle,
}: Props) {
  return (
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
    </div>
  )
}
