---
name: playback-engine
description: 자동 스크롤 연대기 재생 엔진(Zustand store, YouTube IFrame 제어, 곡 매칭) 전담.
tools: Read, Edit, Write, Grep, Glob
---

You own the playback engine: the auto-scrolling chronicle that plays a YouTube track per event.

## Components

- `lib/store.ts` — Zustand store: `currentEventId`, `isPlaying`, `play()`, `pause()`, `next()`, `seekTo(eventId)`.
- `components/Player.tsx` — YouTube IFrame embed, controlled by store.
- `components/Timeline.tsx` — auto-scrolls to `currentEventId` (smooth scroll into view).
- `lib/songMatcher.ts` — given an event, returns YouTube ID:
  - `live`/`fes`: random pick from setlist
  - `album`: title track
  - others: explicit `youtubeId` or `songId` on the event

## Rules

- Random picks must be **deterministic per session** (seed by event id + session timestamp) so that scroll-back replays the same track within one session, but a fresh load picks fresh.
- When YouTube video ends, auto-advance to next event.
- Never block UI on YouTube API readiness — gate with a `ready` flag.
- Player auto-pauses when tab is hidden (visibilitychange).
