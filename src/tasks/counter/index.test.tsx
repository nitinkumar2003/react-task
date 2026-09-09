import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Counter from './index'

describe('Counter — basic increment/decrement', () => {
  it('increments and decrements by the default step of 1 (positive)', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    expect(screen.getByLabelText('Count')).toHaveValue(2)

    await user.click(screen.getByRole('button', { name: 'Decrement' }))
    expect(screen.getByLabelText('Count')).toHaveValue(1)
  })

  it('reset returns count to 0 (positive)', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByLabelText('Count')).toHaveValue(0)
  })
})

describe('Counter — boundary edge cases', () => {
  it('disables increment at max and does not overshoot it (negative)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const maxInput = screen.getByLabelText('Max')
    await user.clear(maxInput)
    await user.type(maxInput, '2')

    const incrementButton = screen.getByRole('button', { name: 'Increment' })
    await user.click(incrementButton)
    await user.click(incrementButton)
    expect(screen.getByLabelText('Count')).toHaveValue(2)
    expect(incrementButton).toBeDisabled()

    // clicking a disabled button should genuinely not fire — value stays put
    await user.click(incrementButton)
    expect(screen.getByLabelText('Count')).toHaveValue(2)
  })

  it('disables decrement at min (negative)', async () => {
    render(<Counter />)
    expect(screen.getByRole('button', { name: 'Decrement' })).toBeDisabled()
  })

  it('a step larger than the remaining headroom clamps to max instead of overshooting (edge case)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const maxInput = screen.getByLabelText('Max')
    const stepInput = screen.getByLabelText('Step')
    await user.clear(maxInput)
    await user.type(maxInput, '10')
    await user.clear(stepInput)
    await user.type(stepInput, '4')

    const incrementButton = screen.getByRole('button', { name: 'Increment' })
    await user.click(incrementButton) // 0 -> 4
    await user.click(incrementButton) // 4 -> 8
    await user.click(incrementButton) // 8 -> 12, clamps to 10

    expect(screen.getByLabelText('Count')).toHaveValue(10)
    expect(incrementButton).toBeDisabled()
  })

  it('rapid clicks all land correctly without dropping or overshooting (edge case)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const maxInput = screen.getByLabelText('Max')
    await user.clear(maxInput)
    await user.type(maxInput, '20')

    const incrementButton = screen.getByRole('button', { name: 'Increment' })
    for (let i = 0; i < 15; i++) {
      await user.click(incrementButton)
    }

    expect(screen.getByLabelText('Count')).toHaveValue(15)
  })

  it('invalid range (min > max) disables both buttons and shows a warning (negative)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const minInput = screen.getByLabelText('Min')
    await user.clear(minInput)
    await user.type(minInput, '20')

    expect(screen.getByRole('alert')).toHaveTextContent(/can't be greater than max/i)
    expect(screen.getByRole('button', { name: 'Increment' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrement' })).toBeDisabled()
  })

  it('lowering max below the current count clamps count down automatically (edge case)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const maxInputInit = screen.getByLabelText('Max')
    await user.clear(maxInputInit)
    await user.type(maxInputInit, '20')

    const incrementButton = screen.getByRole('button', { name: 'Increment' })
    for (let i = 0; i < 8; i++) await user.click(incrementButton)
    expect(screen.getByLabelText('Count')).toHaveValue(8)

    const maxInput = screen.getByLabelText('Max')
    await user.clear(maxInput)
    await user.type(maxInput, '5')

    expect(screen.getByLabelText('Count')).toHaveValue(5)
  })
})

describe('Counter — direct input', () => {
  it('typing a value directly updates the count, clamped on blur (positive)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const maxInput = screen.getByLabelText('Max')
    await user.clear(maxInput)
    await user.type(maxInput, '50')

    const countInput = screen.getByLabelText('Count')
    await user.clear(countInput)
    await user.type(countInput, '30')
    await user.tab() // blur

    expect(countInput).toHaveValue(30)
  })

  it('an out-of-range typed value clamps back into bounds on blur (negative)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const countInput = screen.getByLabelText('Count')
    await user.clear(countInput)
    await user.type(countInput, '999')
    await user.tab()

    expect(countInput).toHaveValue(10) // default max
  })

  it('clearing the input falls back to min instead of leaving it blank/NaN (edge case)', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    const countInput = screen.getByLabelText('Count')
    await user.clear(countInput)

    expect(countInput).toHaveValue(0) // default min
  })
})
