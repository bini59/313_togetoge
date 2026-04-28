'use client'
import { useEffect, useMemo, useRef } from 'react'
import { usePlayback } from '@/lib/store'
import { resolveYoutubeId } from '@/lib/songMatcher'
import type { TimelineEvent } from '@/lib/types'

interface Props {
  events: TimelineEvent[]
  onEnded?: (eventId: string) => void
}

export function Player({ events, onEnded }: Props) {
  const { currentEventId, isPlaying, sessionSeed } = usePlayback()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) ?? null,
    [events, currentEventId],
  )

  const youtubeId = useMemo(
    () => (currentEvent ? resolveYoutubeId(currentEvent, sessionSeed) : null),
    [currentEvent, sessionSeed],
  )

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'onStateChange' && msg.info === 0 && currentEventId) {
          onEnded?.(currentEventId)
        }
      } catch {
        // ignore non-JSON postMessages from YouTube
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [currentEventId, onEnded])

  if (!youtubeId) {
    return (
      <div className="aspect-video w-full bg-black/40 grid place-items-center text-sm text-[var(--color-muted)]">
        재생할 영상이 선택되지 않았습니다.
      </div>
    )
  }

  const params = new URLSearchParams({
    enablejsapi: '1',
    autoplay: isPlaying ? '1' : '0',
    rel: '0',
    modestbranding: '1',
  })

  return (
    <iframe
      ref={iframeRef}
      key={`${youtubeId}-${isPlaying ? 'play' : 'pause'}`}
      className="aspect-video w-full"
      src={`https://www.youtube.com/embed/${youtubeId}?${params.toString()}`}
      title="GBC playback"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  )
}
