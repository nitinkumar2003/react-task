import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SearchDebounceThrottleInfiniteScroll from './index'
import { searchItems, type SearchPage } from './mockApi'

vi.mock('./mockApi', () => ({
  searchItems: vi.fn(),
  PAGE_SIZE: 20,
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

const flushMicrotasks = () => act(async () => {})

function page(labels: string[], hasMore: boolean): SearchPage {
  return { items: labels.map((label) => ({ id: label, label })), hasMore }
}

/** Simulates scrolling to (near) the bottom of the results list. */
function scrollToBottom(list: HTMLElement, { distanceFromBottom = 0 } = {}) {
  Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true })
  Object.defineProperty(list, 'clientHeight', { value: 300, configurable: true })
  Object.defineProperty(list, 'scrollTop', {
    value: 1000 - 300 - distanceFromBottom,
    configurable: true,
  })
  fireEvent.scroll(list)
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout'],
    shouldAdvanceTime: true,
  })
  mockedSearch.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SearchDebounceThrottleInfiniteScroll — debouncing', () => {
  it('loads the first page on mount, for an empty query (positive)', async () => {
    mockedSearch.mockResolvedValue(page(['Sleek Backpack'], false))
    render(<SearchDebounceThrottleInfiniteScroll />)

    await flushMicrotasks()

    expect(mockedSearch).toHaveBeenCalledWith('', 1, expect.any(AbortSignal))
    expect(screen.getByText('Sleek Backpack')).toBeInTheDocument()
  })

  it('typing several characters only fires one search, for the final value (positive)', async () => {
    const user = setup()
    mockedSearch.mockResolvedValue(page([], false))
    render(<SearchDebounceThrottleInfiniteScroll />)
    await flushMicrotasks()
    mockedSearch.mockClear()

    await user.type(screen.getByLabelText('Search products'), 'bag')
    advance(300)
    await flushMicrotasks()

    expect(mockedSearch).toHaveBeenCalledTimes(1)
    expect(mockedSearch).toHaveBeenCalledWith('bag', 1, expect.any(AbortSignal))
  })
})

describe('SearchDebounceThrottleInfiniteScroll — results', () => {
  it('shows a "no results" message when the API returns nothing (negative)', async () => {
    mockedSearch.mockResolvedValue(page([], false))
    render(<SearchDebounceThrottleInfiniteScroll />)

    await flushMicrotasks()

    expect(screen.getByText('No results for ""')).toBeInTheDocument()
  })

  it('shows an error message with a retry button when the search rejects (negative)', async () => {
    mockedSearch.mockRejectedValue(new Error('network down'))
    render(<SearchDebounceThrottleInfiniteScroll />)

    await flushMicrotasks()

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('clicking retry after a failed initial load re-fetches page 1 (positive)', async () => {
    const user = setup()
    mockedSearch.mockRejectedValueOnce(new Error('network down'))
    render(<SearchDebounceThrottleInfiniteScroll />)
    await flushMicrotasks()

    mockedSearch.mockResolvedValueOnce(page(['Cozy Mug'], false))
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await flushMicrotasks()

    expect(screen.getByText('Cozy Mug')).toBeInTheDocument()
  })
})

describe('SearchDebounceThrottleInfiniteScroll — infinite scroll', () => {
  it('scrolling near the bottom loads the next page and appends its results (positive)', async () => {
    mockedSearch.mockResolvedValueOnce(page(['Item 1'], true))
    render(<SearchDebounceThrottleInfiniteScroll />)
    await flushMicrotasks()
    expect(screen.getByText('Item 1')).toBeInTheDocument()

    mockedSearch.mockResolvedValueOnce(page(['Item 2'], false))
    scrollToBottom(screen.getByRole('list'))
    await flushMicrotasks()

    expect(mockedSearch).toHaveBeenLastCalledWith('', 2, expect.any(AbortSignal))
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('does not load more when already near the top (negative)', async () => {
    mockedSearch.mockResolvedValueOnce(page(['Item 1'], true))
    render(<SearchDebounceThrottleInfiniteScroll />)
    await flushMicrotasks()
    mockedSearch.mockClear()

    scrollToBottom(screen.getByRole('list'), { distanceFromBottom: 500 })
    await flushMicrotasks()

    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('shows "you\'ve reached the end" once hasMore is false (edge case)', async () => {
    mockedSearch.mockResolvedValueOnce(page(['Item 1'], false))
    render(<SearchDebounceThrottleInfiniteScroll />)
    await flushMicrotasks()

    expect(screen.getByText("You've reached the end.")).toBeInTheDocument()
  })

  it('rapid repeated scroll events near the bottom only trigger one extra page load while it is in flight (back-pressure, edge case)', async () => {
    mockedSearch.mockResolvedValueOnce(page(['Item 1'], true))
    render(<SearchDebounceThrottleInfiniteScroll />)
    await flushMicrotasks()
    mockedSearch.mockClear()

    let resolvePage2!: (value: SearchPage) => void
    mockedSearch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePage2 = resolve
      }),
    )

    const list = screen.getByRole('list')
    scrollToBottom(list)
    advance(250) // clear the scroll throttle window so a second scroll isn't just throttled away
    scrollToBottom(list) // fired again while page 2 is still loading

    expect(mockedSearch).toHaveBeenCalledTimes(1) // the back-pressure guard, not the throttle, blocks this one

    resolvePage2(page(['Item 2'], false))
    await flushMicrotasks()

    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})
