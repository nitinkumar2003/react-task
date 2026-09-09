import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StopwatchTimer from './index'

function setup() {
  return userEvent.setup({ delay: null })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  // fake only Date + interval timers — leaving requestAnimationFrame/
  // MessageChannel/queueMicrotask real so React 18's scheduler (which
  // userEvent's act()-wrapped clicks depend on to flush) doesn't hang
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StopwatchTimer — running', () => {
  it('starts at 00:00.00 (positive)', () => {
    render(<StopwatchTimer />)
    expect(screen.getByText('00:00.00')).toBeInTheDocument()
  })

  it('accumulates elapsed time from wall-clock deltas, not tick count (positive)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))

    advance(1000)

    expect(screen.getByText('00:01.00')).toBeInTheDocument()
  })

  it('keeps accumulating correctly across several separate ticks (edge case)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))

    advance(300)
    advance(300)
    advance(400)

    expect(screen.getByText('00:01.00')).toBeInTheDocument()
  })
})

describe('StopwatchTimer — pause / resume', () => {
  it('pause freezes the displayed time (positive)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    advance(500)
    await user.click(screen.getByRole('button', { name: 'Pause' }))

    expect(screen.getByText('00:00.50')).toBeInTheDocument()
    advance(2000)
    expect(screen.getByText('00:00.50')).toBeInTheDocument()
  })

  it('resume continues from the paused value instead of restarting from zero (regression)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    advance(1000)
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    advance(1000)

    expect(screen.getByText('00:02.00')).toBeInTheDocument()
  })

  it('clicking Pause without ever starting does nothing harmful (negative)', () => {
    render(<StopwatchTimer />)
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })
})

describe('StopwatchTimer — reset', () => {
  it('is disabled when nothing has run yet (negative)', () => {
    render(<StopwatchTimer />)
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('clears elapsed time and laps, and stops a running stopwatch (positive)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    advance(1000)
    await user.click(screen.getByRole('button', { name: 'Lap' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByText('00:00.00')).toBeInTheDocument()
    expect(screen.queryByText(/Lap 1/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('time does not keep advancing after reset, even though the interval was mid-flight (edge case)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    advance(700)
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    advance(2000)

    expect(screen.getByText('00:00.00')).toBeInTheDocument()
  })
})

describe('StopwatchTimer — laps', () => {
  it('Lap is disabled before starting (negative)', () => {
    render(<StopwatchTimer />)
    expect(screen.getByRole('button', { name: 'Lap' })).toBeDisabled()
  })

  it('Lap is disabled while paused (negative)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    advance(500)
    await user.click(screen.getByRole('button', { name: 'Pause' }))

    expect(screen.getByRole('button', { name: 'Lap' })).toBeDisabled()
  })

  it('records laps newest-first, each with a delta from the previous lap (positive)', async () => {
    const user = setup()
    render(<StopwatchTimer />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    advance(1000)
    await user.click(screen.getByRole('button', { name: 'Lap' }))
    advance(500)
    await user.click(screen.getByRole('button', { name: 'Lap' }))

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Lap 2')
    expect(items[0]).toHaveTextContent('+00:00.50')
    expect(items[1]).toHaveTextContent('Lap 1')
    expect(items[1]).toHaveTextContent('+00:01.00')
  })
})
