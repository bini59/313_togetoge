'use client'
import { useEffect, useMemo, useRef } from 'react'
import { usePlayback } from '@/lib/store'
import { resolveSong } from '@/lib/songMatcher'
import type { TimelineEvent } from '@/lib/types'

interface Props {
  events: TimelineEvent[]
  onEnded?: (eventId: string) => void
  /** Mute the audio track. Used when this Player acts as a background visual layer. */
  muted?: boolean
}

const ALLOWED_ORIGINS = new Set([
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
])

export function Player({ events, onEnded, muted = false }: Props) {
  const { currentEventId, isPlaying, sessionSeed, recordProgress, consumeStartTime } = usePlayback()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) ?? null,
    [events, currentEventId],
  )

  const resolved = useMemo(
    () =>
      currentEvent
        ? resolveSong(currentEvent, sessionSeed)
        : { youtubeId: null as string | null, song: null },
    [currentEvent, sessionSeed],
  )
  const youtubeId = resolved.youtubeId

  // Compute resume start once per video. consumeStartTime is a pure read on the
  // store; safe inside useMemo. The iframe `key` is youtubeId only, so this
  // value never causes a remount on its own.
  const startSec = useMemo(() => {
    if (!youtubeId) return 0
    const resumed = consumeStartTime(youtubeId)
    return resumed > 0 ? resumed : (resolved.song?.highlightStartSec ?? 0)
  }, [youtubeId, resolved.song, consumeStartTime])

  const src = useMemo(() => {
    if (!youtubeId) return null
    const params = new URLSearchParams({
      enablejsapi: '1',
      autoplay: isPlaying ? '1' : '0',
      rel: '0',
      modestbranding: '1',
    })
    if (startSec > 0) params.set('start', String(startSec))
    if (muted) params.set('mute', '1')
    return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`
  }, [youtubeId, isPlaying, startSec, muted])

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
      ;['onStateChange', 'infoDelivery'].forEach((ev) => {
        win.postMessage(
          JSON.stringify({ event: 'command', func: 'addEventListener', args: [ev], id: 1 }),
          '*',
        )
      })
    }
    iframe.addEventListener('load', subscribe)
    subscribe()
    return () => iframe.removeEventListener('load', subscribe)
  }, [youtubeId])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!ALLOWED_ORIGINS.has(e.origin)) return
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

  if (!src) {
    return (
      <div className="aspect-video w-full bg-black/40 grid place-items-center text-sm text-[var(--color-muted)]">
        재생할 영상이 선택되지 않았습니다.
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      key={youtubeId}
      className="aspect-video w-full"
      src={src}
      title="GBC playback"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  )
}
