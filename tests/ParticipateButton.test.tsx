import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ParticipateButton } from '@/components/ParticipateButton'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('<ParticipateButton />', () => {
  it('renders type-specific label and initial count', () => {
    render(
      <ParticipateButton eventId="live-1" eventType="live" initialCount={42} />,
    )
    expect(screen.getByRole('button')).toHaveTextContent('라이브 참여')
    expect(screen.getByRole('button')).toHaveTextContent('42')
  })

  it('reflects alreadyParticipated state on mount', () => {
    render(
      <ParticipateButton
        eventId="live-1"
        eventType="live"
        initialCount={1}
        initialDone
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('참여완료')).toBeInTheDocument()
  })

  it('updates count from server response after click', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ count: 7, alreadyParticipated: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(
      <ParticipateButton eventId="album-1" eventType="album" initialCount={6} />,
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('앨범 구매')
    fireEvent.click(btn)
    await screen.findByText('참여완료')
    expect(btn).toHaveTextContent('7')
  })
})
