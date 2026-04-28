'use client'
import { useEffect, type RefObject } from 'react'
import type { TimelineEvent } from '@/lib/types'
import { resolveYoutubeId } from '@/lib/songMatcher'

interface Slot {
  x: number
  w: number
  hasVideo: boolean
  center: number
}

interface Args {
  isPlaying: boolean
  activeEvent: TimelineEvent | null
  activeIndex: number
  slots: Slot[]
  stripRef: RefObject<HTMLDivElement | null>
  progressBarRef: RefObject<HTMLDivElement | null>
  playheadRef: RefObject<HTMLDivElement | null>
  sectionMsWithVideo: number
  sectionMsNoVideo: number
  onSectionEnd: (eventId: string) => void
}

const PLAYHEAD_HALF_WIDTH = 7
const SCROLL_FOLLOW_LERP = 0.15

function setPlayhead(
  progressBarRef: RefObject<HTMLDivElement | null>,
  playheadRef: RefObject<HTMLDivElement | null>,
  x: number,
  visible: boolean,
) {
  const bar = progressBarRef.current
  if (bar) {
    bar.style.width = `${Math.max(0, x)}px`
    bar.style.opacity = visible ? '1' : '0'
  }
  const head = playheadRef.current
  if (head) {
    head.style.left = `${x - PLAYHEAD_HALF_WIDTH}px`
    head.style.opacity = visible ? '1' : '0'
  }
}

export function usePlayheadAnimation({
  isPlaying,
  activeEvent,
  activeIndex,
  slots,
  stripRef,
  progressBarRef,
  playheadRef,
  sectionMsWithVideo,
  sectionMsNoVideo,
  onSectionEnd,
}: Args) {
  // When idle (not playing), pin playhead to the active slot.
  useEffect(() => {
    if (isPlaying) return
    const from = slots[activeIndex]
    if (!from) {
      setPlayhead(progressBarRef, playheadRef, -9999, false)
      return
    }
    setPlayhead(progressBarRef, playheadRef, from.center, true)
  }, [isPlaying, activeIndex, slots, progressBarRef, playheadRef])

  useEffect(() => {
    if (!isPlaying || !activeEvent) return
    const fromSlot = slots[activeIndex]
    if (!fromSlot) return
    const toSlot = slots[activeIndex + 1] ?? fromSlot
    const hasVideo = resolveYoutubeId(activeEvent) !== null
    const sectionMs = hasVideo ? sectionMsWithVideo : sectionMsNoVideo
    const start = performance.now()
    let raf = 0

    const tick = (t: number) => {
      const p = Math.min((t - start) / sectionMs, 1)
      const headX = fromSlot.center + (toSlot.center - fromSlot.center) * p
      setPlayhead(progressBarRef, playheadRef, headX, true)

      const strip = stripRef.current
      if (strip) {
        const target = headX - strip.clientWidth / 2
        const max = strip.scrollWidth - strip.clientWidth
        const clamped = Math.max(0, Math.min(target, max))
        strip.scrollLeft += (clamped - strip.scrollLeft) * SCROLL_FOLLOW_LERP
      }

      if (p >= 1) {
        onSectionEnd(activeEvent.id)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    isPlaying,
    activeEvent,
    activeIndex,
    slots,
    stripRef,
    progressBarRef,
    playheadRef,
    sectionMsWithVideo,
    sectionMsNoVideo,
    onSectionEnd,
  ])
}
