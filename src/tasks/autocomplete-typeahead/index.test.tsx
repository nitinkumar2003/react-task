import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AutocompleteTypeahead from './index'
import { searchItems, type SearchResult } from './mockApi'

vi.mock('./mockApi', () => ({
  searchItems: vi.fn(),
}))

const mockedSearch = vi.mocked(searchItems)

function setup() {
  return userEvent.setup({ delay: null })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** lets a test control exactly when a mocked search call resolves/rejects */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** advances one microtask tick — enough for an already-settled promise's .then to run */
const flushMicrotasks = () => act(async () => {})

const INDIA: SearchResult = { id: 'India', label: 'India' }
const INDONESIA: SearchResult = { id: 'Indonesia', label: 'Indonesia' }

beforeEach(() => {
  // shouldAdvanceTime: true — without it, userEvent's own internal
  // setTimeout(0) calls never fire once setTimeout is faked, and every
  // single interaction (even a plain click) hangs forever. With it, real
  // wall-clock time keeps the fake clock ticking in the background too, so
  // userEvent's internal timers resolve themselves; explicit
  // advanceTimersByTime() calls below are still what actually fast-forwards
  // past our own 300ms debounce window.
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout'],
    shouldAdvanceTime: true,
  })
  mockedSearch.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AutocompleteTypeahead — debouncing', () => {
  it('does not call the API for an empty query (negative)', () => {
    render(<AutocompleteTypeahead />)
    advance(500)
    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('typing several characters only fires one search, for the final value (positive)', async () => {
    const user = setup()
    const { promise } = deferred<SearchResult[]>()
    mockedSearch.mockReturnValue(promise)
    render(<AutocompleteTypeahead />)

    await user.type(screen.getByRole('combobox'), 'ind')
    advance(300)

    // three keystrokes ('i', 'n', 'd') — but only ONE search call, for the
    // final settled value, not three calls (one per keystroke)
    expect(mockedSearch).toHaveBeenCalledTimes(1)
    expect(mockedSearch).toHaveBeenCalledWith('ind', expect.any(AbortSignal))
  })
})

describe('AutocompleteTypeahead — results', () => {
  it('renders results returned by the search (positive)', async () => {
    const user = setup()
    mockedSearch.mockResolvedValue([INDIA, INDONESIA])
    render(<AutocompleteTypeahead />)

    await user.type(screen.getByRole('combobox'), 'ind')
    advance(300)
    await flushMicrotasks()

    expect(screen.getByRole('option', { name: 'India' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Indonesia' })).toBeInTheDocument()
  })

  it('shows a "no results" message when the API returns nothing (negative)', async () => {
    const user = setup()
    mockedSearch.mockResolvedValue([])
    render(<AutocompleteTypeahead />)

    await user.type(screen.getByRole('combobox'), 'zzz')
    advance(300)
    await flushMicrotasks()

    expect(screen.getByText('No results for "zzz"')).toBeInTheDocument()
  })

  it('shows an error message when the search rejects (negative)', async () => {
    const user = setup()
    mockedSearch.mockRejectedValue(new Error('network down'))
    render(<AutocompleteTypeahead />)

    await user.type(screen.getByRole('combobox'), 'ind')
    advance(300)
    await flushMicrotasks()

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
  })
})

describe('AutocompleteTypeahead — caching', () => {
  it('does not re-call the API for a query already seen, and flags the result as cached (positive)', async () => {
    const user = setup()
    mockedSearch.mockResolvedValue([INDIA])
    render(<AutocompleteTypeahead />)
    const input = screen.getByRole('combobox')

    await user.type(input, 'india')
    advance(300)
    await flushMicrotasks()
    expect(mockedSearch).toHaveBeenCalledTimes(1)

    await user.clear(input)
    advance(300)
    await user.type(input, 'india')
    advance(300)
    await flushMicrotasks()

    expect(mockedSearch).toHaveBeenCalledTimes(1) // still just once — served from cache
    expect(screen.getByText('Loaded from cache — no request made.')).toBeInTheDocument()
  })
})

describe('AutocompleteTypeahead — stale request cancellation', () => {
  it('a slow response for an old query never overwrites a newer, already-resolved one (edge case / regression)', async () => {
    const user = setup()
    const slowIndia = deferred<SearchResult[]>()
    const fastIndonesia = deferred<SearchResult[]>()
    mockedSearch
      .mockReturnValueOnce(slowIndia.promise) // first call: for "india"
      .mockReturnValueOnce(fastIndonesia.promise) // second call: for "indonesia"

    render(<AutocompleteTypeahead />)
    const input = screen.getByRole('combobox')

    await user.type(input, 'india')
    advance(300) // fires the "india" request — left pending on purpose

    await user.type(input, 'onesia') // query is now "indonesia"
    advance(300) // fires the "indonesia" request; cleanup aborts the "india" one

    const indiaSignal = mockedSearch.mock.calls[0][1]
    expect(indiaSignal.aborted).toBe(true)

    // resolve the newer request first, exactly like a real fast response would
    fastIndonesia.resolve([INDONESIA])
    await flushMicrotasks()
    expect(screen.getByRole('option', { name: 'Indonesia' })).toBeInTheDocument()

    // ...then the stale, slow one finally resolves too (out of order)
    slowIndia.resolve([INDIA])
    await flushMicrotasks()

    // the stale India result must NOT have clobbered the current Indonesia result
    expect(screen.queryByRole('option', { name: 'India' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Indonesia' })).toBeInTheDocument()
  })
})

describe('AutocompleteTypeahead — keyboard navigation', () => {
  async function renderWithResults() {
    const user = setup()
    mockedSearch.mockResolvedValue([INDIA, INDONESIA])
    render(<AutocompleteTypeahead />)
    const input = screen.getByRole('combobox')
    await user.type(input, 'ind')
    advance(300)
    await flushMicrotasks()
    return { user, input }
  }

  it('ArrowDown highlights options in order, Enter selects the highlighted one (positive)', async () => {
    const { user, input } = await renderWithResults()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'India' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Indonesia' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Enter}')
    expect(input).toHaveValue('Indonesia')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ArrowDown does not move past the last option (edge case)', async () => {
    const { user } = await renderWithResults()

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Indonesia' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowUp does not move above the first option (edge case)', async () => {
    const { user } = await renderWithResults()

    await user.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(screen.getByRole('option', { name: 'India' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Escape closes the dropdown without changing the typed text (negative)', async () => {
    const { user, input } = await renderWithResults()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('ind')
  })

  it('clicking an option selects it (positive)', async () => {
    const { user, input } = await renderWithResults()

    await user.click(screen.getByRole('option', { name: 'India' }))
    expect(input).toHaveValue('India')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
