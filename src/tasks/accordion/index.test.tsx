import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Accordion from './index'
import styles from './index.module.css'

describe('Accordion — single-open mode (default)', () => {
  it('opening a panel marks it expanded and applies the open class (positive)', async () => {
    const user = setup()
    render(<Accordion />)

    await user.click(screen.getByRole('button', { name: /shipping/i }))

    const header = screen.getByRole('button', { name: /shipping/i })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: /shipping/i })).toHaveClass(styles.panelOpen)
  })

  it('a panel that has never been opened keeps the closed class (negative)', () => {
    render(<Accordion />)

    expect(screen.getByRole('region', { name: /shipping/i })).toHaveClass(styles.panel)
    expect(screen.getByRole('region', { name: /shipping/i })).not.toHaveClass(styles.panelOpen)
  })

  it('wires aria-controls/aria-labelledby so the header and panel reference each other (positive)', () => {
    render(<Accordion />)

    const header = screen.getByRole('button', { name: /shipping/i })
    const panel = screen.getByRole('region', { name: /shipping/i })

    expect(header).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', header.id)
  })

  it('clicking an open panel again closes it (positive)', async () => {
    const user = setup()
    render(<Accordion />)
    const shippingHeader = screen.getByRole('button', { name: /shipping/i })

    await user.click(shippingHeader)
    await user.click(shippingHeader)

    expect(shippingHeader).toHaveAttribute('aria-expanded', 'false')
  })

  it('opening a second panel closes the first (negative)', async () => {
    const user = setup()
    render(<Accordion />)

    await user.click(screen.getByRole('button', { name: /shipping/i }))
    await user.click(screen.getByRole('button', { name: /return/i }))

    expect(screen.getByRole('button', { name: /shipping/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /return/i })).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('Accordion — multiple-open mode', () => {
  it('with the toggle checked, two panels can be open at once (positive)', async () => {
    const user = setup()
    render(<Accordion />)

    await user.click(screen.getByLabelText(/allow multiple panels open/i))
    await user.click(screen.getByRole('button', { name: /shipping/i }))
    await user.click(screen.getByRole('button', { name: /return/i }))

    expect(screen.getByRole('button', { name: /shipping/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /return/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('switching back to single-open mode collapses everything (edge case)', async () => {
    const user = setup()
    render(<Accordion />)
    const multipleToggle = screen.getByLabelText(/allow multiple panels open/i)

    await user.click(multipleToggle)
    await user.click(screen.getByRole('button', { name: /shipping/i }))
    await user.click(screen.getByRole('button', { name: /return/i }))
    await user.click(multipleToggle)

    expect(screen.getByRole('button', { name: /shipping/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /return/i })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Accordion — keyboard navigation', () => {
  it('ArrowDown moves focus to the next header (positive)', async () => {
    const user = setup()
    render(<Accordion />)

    screen.getByRole('button', { name: /shipping/i }).focus()
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('button', { name: /return/i })).toHaveFocus()
  })

  it('ArrowUp from the first header wraps focus to the last header (edge case)', async () => {
    const user = setup()
    render(<Accordion />)

    screen.getByRole('button', { name: /shipping/i }).focus()
    await user.keyboard('{ArrowUp}')

    expect(screen.getByRole('button', { name: /support/i })).toHaveFocus()
  })

  it('ArrowDown from the last header wraps focus to the first header (edge case)', async () => {
    const user = setup()
    render(<Accordion />)

    screen.getByRole('button', { name: /support/i }).focus()
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('button', { name: /shipping/i })).toHaveFocus()
  })

  it('End moves focus to the last header, Home moves it back to the first (positive)', async () => {
    const user = setup()
    render(<Accordion />)

    screen.getByRole('button', { name: /shipping/i }).focus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: /support/i })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: /shipping/i })).toHaveFocus()
  })

  it('Enter toggles the focused header, same as a click (positive)', async () => {
    const user = setup()
    render(<Accordion />)

    screen.getByRole('button', { name: /shipping/i }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: /shipping/i })).toHaveAttribute('aria-expanded', 'true')
  })
})

function setup() {
  return userEvent.setup()
}
