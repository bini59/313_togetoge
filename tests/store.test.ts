import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayback } from '@/lib/store'

describe('playback store', () => {
  beforeEach(() => {
    usePlayback.setState({
      currentEventId: null,
      isPlaying: false,
      programmaticUntil: 0,
    })
  })

  it('setCurrent installs a programmatic-scroll guard window', () => {
    usePlayback.getState().setCurrent('evt-a')
    const s = usePlayback.getState()
    expect(s.currentEventId).toBe('evt-a')
    expect(s.programmaticUntil).toBeGreaterThan(Date.now() - 100)
  })

  it('setCurrentFromScroll is ignored during the guard window', () => {
    usePlayback.getState().setCurrent('evt-a')
    usePlayback.getState().setCurrentFromScroll('evt-b')
    expect(usePlayback.getState().currentEventId).toBe('evt-a')
  })

  it('setCurrentFromScroll updates after the guard expires', () => {
    usePlayback.setState({ currentEventId: 'evt-a', programmaticUntil: Date.now() - 1 })
    usePlayback.getState().setCurrentFromScroll('evt-b')
    expect(usePlayback.getState().currentEventId).toBe('evt-b')
  })

  it('play / pause / toggle flip isPlaying', () => {
    usePlayback.getState().play()
    expect(usePlayback.getState().isPlaying).toBe(true)
    usePlayback.getState().toggle()
    expect(usePlayback.getState().isPlaying).toBe(false)
    usePlayback.getState().pause()
    expect(usePlayback.getState().isPlaying).toBe(false)
  })
})
