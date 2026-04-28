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
  const { currentEventId, isPlaying, sessionSeed, recordProgress, consumeStartTime } = usePlayback()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) ?? null,
    [events, currentEventId],
  )

  const youtubeId = useMemo(
    () => (currentEvent ? resolveYoutubeId(currentEvent, sessionSeed) : null),
    [currentEvent, sessionSeed],
  )

  // Resolve start offset once per (youtubeId, eventId) combo. We capture it
  // when the video mounts so the iframe key/src is stable for the session.
  // Re-evaluate only when the videoId changes, not on every render —
  // otherwise the iframe would keep resetting. consumeStartTime is stable.
  const startSecRef = useRef(0)
  const lastIdRef = useRef<string | null>(null)
  if (youtubeId && lastIdRef.current !== youtubeId) {
    startSecRef.current = consumeStartTime(youtubeId)
    lastIdRef.current = youtubeId
  }
  const startSec = startSecRef.current

  // Ask the iframe to push infoDelivery events (currentTime, duration).
  useEffect(() => {
    if (!youtubeId) return
    const iframe = iframeRef.current
    if (!iframe) return
    function subscribe() {
      const win = iframe?.contentWindow
      if (!win) return
      win.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
        '*',
      )
      // Opt-in to onStateChange + infoDelivery streams.
      ;['onStateChange', 'infoDelivery'].forEach((ev) => {
        win.postMessage(
          JSON.stringify({ event: 'command', func: 'addEventListener', args: [ev], id: 1 }),
          '*',
        )
      })
    }
    iframe.addEventListener('load', subscribe)
    // Already-loaded edge case
    subscribe()
    return () => iframe.removeEventListener('load', subscribe)
  }, [youtubeId])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (typeof e.data !== 'string') return
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'onStateChange' && msg.info === 0 && currentEventId) {
          onEnded?.(currentEventId)
        }
        if (msg.event === 'infoDelivery' && msg.info && youtubeId) {
          const t = typeof msg.info.currentTime === 'number' ? msg.info.currentTime : null
          const d = typeof msg.info.duration === 'number' ? msg.info.duration : 0
          if (t !== null) recordProgress(youtubeId, t, d)
        }
      } catch {
        // ignore non-JSON postMessages from YouTube
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [currentEventId, onEnded, youtubeId, recordProgress])

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
  if (startSec > 0) params.set('start', String(startSec))

  return (
    <iframe
      ref={iframeRef}
      key={`${youtubeId}-${startSec}`}
      className="aspect-video w-full"
      src={`https://www.youtube.com/embed/${youtubeId}?${params.toString()}`}
      title="GBC playback"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  )
}
