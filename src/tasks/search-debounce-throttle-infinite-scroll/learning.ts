import type { LearningContent } from '../learning-types'

const content: LearningContent = {
  summary:
    'A searchable, paginated list combining three independent rate-limiting/loading techniques: debounce the ' +
    'text input (wait for typing to pause before searching), throttle the scroll handler (cap how often it ' +
    'actually runs, no matter how many scroll events fire), and infinite scroll (fetch the next page only when ' +
    'the user nears the bottom). A "generation" counter guards against stale responses the same way ' +
    'AbortController does in the autocomplete task, and a plain boolean ref stops the scroll handler from ' +
    'firing a second page-load while one is already in flight.',

  concepts: [
    'debouncing the search input (useDebouncedValue)',
    'throttling a high-frequency event handler (scroll)',
    'infinite scroll via scroll-position math (scrollHeight/scrollTop/clientHeight)',
    'pagination (page number + hasMore)',
    'race conditions between async requests, guarded with a generation counter',
    'back-pressure: a ref flag preventing overlapping "load more" requests',
    'AbortController / AbortSignal for cancelling in-flight requests',
    'useCallback for a stable function identity passed into a custom hook',
    'adjusting state during render vs. in an effect',
  ],

  codeSnippets: [
    {
      title: '1. Debouncing the input — same mechanism as the autocomplete task',
      code: `const debouncedQuery = useDebouncedValue(query.trim(), 300)

// this effect only re-runs once typing has paused for 300ms, not on
// every keystroke
useEffect(() => {
  searchItems(debouncedQuery, 1, controller.signal).then(/* ... */)
}, [debouncedQuery, retryKey])`,
      explanation:
        'Debouncing answers "the user is typing — when do I actually search?" by waiting for silence. It\'s ' +
        'about spacing out how often an ACTION (the search request) fires in response to a burst of DISCRETE ' +
        'events (keystrokes), by delaying until they stop.',
    },
    {
      title: '2. Throttling the scroll handler — a different problem than debouncing',
      code: `export function useThrottledCallback(callback, delayMs) {
  const lastRunAtRef = useRef(0)
  const trailingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  return useCallback((...args) => {
    const now = Date.now()
    const elapsed = now - lastRunAtRef.current
    clearTimeout(trailingTimeoutRef.current)

    if (elapsed >= delayMs) {
      lastRunAtRef.current = now
      callback(...args)                 // leading edge: runs right away
    } else {
      trailingTimeoutRef.current = setTimeout(() => {
        lastRunAtRef.current = Date.now()
        callback(...args)               // trailing edge: runs once the window ends
      }, delayMs - elapsed)
    }
  }, [callback, delayMs])
}`,
      explanation:
        'Scroll doesn\'t fire in discrete bursts like keystrokes — it fires CONTINUOUSLY, dozens of times a ' +
        'second, for as long as the user drags. Debouncing that (wait for scrolling to fully stop) would mean ' +
        'never checking the scroll position until the user lets go — too late to feel responsive. Throttling ' +
        'instead guarantees the handler runs at most once per `delayMs`, spread evenly across the whole ' +
        'gesture: the very first event fires immediately (leading edge), everything else within the window is ' +
        'dropped, and — critically — the LAST event of the window still gets one final run after it ends ' +
        '(trailing edge), so the final scroll position is never skipped entirely.',
    },
    {
      title: '3. Detecting "near the bottom" — plain scroll-position arithmetic',
      code: `const handleScroll = useCallback((e: React.UIEvent<HTMLUListElement>) => {
  const el = e.currentTarget
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  if (distanceFromBottom < SCROLL_THRESHOLD_PX) loadMore()
}, [loadMore])`,
      explanation:
        '`scrollHeight` is the TOTAL scrollable content height, `clientHeight` is the visible viewport height, ' +
        'and `scrollTop` is how far down the user has scrolled. `scrollHeight - scrollTop - clientHeight` is ' +
        'exactly the remaining, not-yet-visible content below the viewport — it hits 0 exactly at the bottom. ' +
        'Triggering the next page load at some threshold ABOVE 0 (here, 80px early) means the next page is ' +
        'usually already loaded by the time the user actually reaches the bottom, instead of them hitting a ' +
        'visible dead stop and waiting.',
    },
    {
      title: '4. Back-pressure — the throttle alone does not prevent overlapping requests',
      code: `const loadingMoreRef = useRef(false)

const loadMore = useCallback(() => {
  if (loadingMoreRef.current || !hasMore || status === 'loading') return
  loadingMoreRef.current = true
  // ...fetch page N+1...
  searchItems(/* ... */).then(() => {
    loadingMoreRef.current = false
    /* ... */
  })
}, [debouncedQuery, hasMore, page, status])`,
      explanation:
        'Throttling limits how often the scroll handler RUNS — it says nothing about whether the PREVIOUS ' +
        'page request has finished yet. If the user keeps scrolling near the bottom, the throttled handler ' +
        'will fire again every `delayMs`, and without a guard, each firing would kick off ANOTHER fetch for ' +
        'the same next page while the first one is still in flight. `loadingMoreRef` is a plain boolean ref ' +
        '(not state — nothing about it needs to trigger a re-render) that\'s set the instant a fetch starts ' +
        'and cleared the instant it settles, so a second `loadMore()` call that lands in between is a no-op.',
    },
    {
      title: '5. The "generation" counter — the same stale-response problem as autocomplete, one layer up',
      code: `const generationRef = useRef(0)

useEffect(() => {
  const myGeneration = ++generationRef.current   // bump on every NEW search
  searchItems(debouncedQuery, 1, controller.signal).then(({ items }) => {
    if (myGeneration !== generationRef.current) return   // a newer search has since started — discard
    setItems(items)
  })
  return () => controller.abort()
}, [debouncedQuery, retryKey])

const loadMore = useCallback(() => {
  const myGeneration = generationRef.current       // capture, don't bump — this ISN'T a new search
  searchItems(debouncedQuery, nextPage, /* ... */).then(({ items }) => {
    if (myGeneration !== generationRef.current) return
    setItems((prev) => [...prev, ...items])
  })
}, [/* ... */])`,
      explanation:
        'AbortController alone (as used for the page-1 search, inside the effect) covers requests that have a ' +
        'clear cleanup point. `loadMore()`\'s page-2+ fetch is fired from an event handler, not from inside an ' +
        'effect, so there\'s no automatic "cancel this when the query changes" cleanup for it. The generation ' +
        'counter is a lighter-weight, manual version of the same idea: every NEW search bumps it, and both the ' +
        'page-1 effect and every in-flight `loadMore()` call captured the generation THEY were started for — ' +
        'if the number has moved on by the time a response arrives, that response is for a search the user has ' +
        'already abandoned, and gets silently discarded instead of appending stale rows to a new results list.',
    },
  ],

  interviewQuestions: [
    {
      question: 'What is the difference between debouncing and throttling?',
      answer:
        'Both limit how often something runs in response to frequent events, but they solve different shaped ' +
        'problems. Debouncing waits for a BURST of events to go quiet, then runs once — good for "the user is ' +
        'done typing/resizing, now do the expensive thing." Throttling instead guarantees the handler runs at ' +
        'most once per fixed time window for as long as events KEEP COMING — good for a continuous stream like ' +
        'scroll or mousemove, where you still want periodic updates DURING the activity, not only after it ' +
        'stops.',
    },
    {
      question: 'Why does the scroll handler need throttling here specifically?',
      answer:
        'A `scroll` event can fire dozens of times per second while the user drags. The handler itself does a ' +
        'small amount of arithmetic (reading `scrollHeight`/`scrollTop`/`clientHeight`, which can force the ' +
        'browser to recompute layout) and, near the bottom, calls `loadMore()`. Running that on every single ' +
        'scroll event is wasted work — throttling caps it to a sane rate (here, once per 200ms) while still ' +
        'staying responsive enough that reaching the bottom is detected promptly.',
    },
    {
      question: 'What does "leading edge" and "trailing edge" mean for a throttle?',
      answer:
        'They describe WHEN, within a throttle window, the callback actually runs. Leading edge = it runs ' +
        'immediately on the first qualifying call, then ignores the rest of the window. Trailing edge = ' +
        'instead of (or in addition to) that immediate run, it schedules one more run for the END of the ' +
        'window, using whatever the most recent call\'s arguments were. This implementation does both: instant ' +
        'feedback on the first event, but the trailing run means the very last scroll position during a fast ' +
        'gesture still gets checked, instead of the throttle silently swallowing it.',
    },
    {
      question: 'What is "back-pressure", and why is a ref used for it instead of state?',
      answer:
        'Back-pressure here means: don\'t let a fast-firing trigger (throttled scroll) start a second unit of ' +
        'work (a page fetch) before the first one has finished. It\'s implemented with `loadingMoreRef`, a ' +
        'plain boolean `useRef`, not `useState` — because this flag never needs to change what\'s rendered on ' +
        'screen (the visible "Loading more…" indicator is already driven by the `status` state); it only needs ' +
        'to be read and written instantly, inside an event handler, without triggering a re-render. That\'s ' +
        'exactly the "value doesn\'t affect the UI, but code needs to read/write it imperatively" case a ref is ' +
        'for.',
    },
    {
      question: 'How does the "generation" counter prevent a stale page response from corrupting the list?',
      answer:
        'Every time a brand-new search starts (the debounced query changes, or the user clicks Retry), the ' +
        'counter is incremented. Any fetch in flight at that moment — whether it\'s the page-1 search itself or ' +
        'a `loadMore()` page-2+ request — captured the generation number it was started with, in a local ' +
        '`const myGeneration`. When that fetch\'s response finally arrives, it compares its captured number ' +
        'against the ref\'s CURRENT value; if they don\'t match, a newer search has since started and this ' +
        'response is stale, so it\'s thrown away instead of being applied. It\'s the same race-condition problem ' +
        'the autocomplete task solves with `AbortController` — this is a lighter-weight version for a request ' +
        '(`loadMore`) that isn\'t started from inside an effect and so has no natural cleanup hook to abort it ' +
        'from.',
    },
    {
      question: 'Why is `useCallback` used for `handleScroll` and inside `useThrottledCallback`?',
      answer:
        '`useCallback` memoizes a function so it keeps the SAME identity across re-renders as long as its ' +
        'dependencies haven\'t changed. `useThrottledCallback` needs this because it stores throttling state ' +
        '(`lastRunAtRef`, a pending trailing timeout) that must persist across calls — if it handed back a ' +
        'brand-new function every render, the identity `onScroll={throttledHandleScroll}` receives would keep ' +
        'changing too, which is harmless for a plain DOM event prop here, but the pattern matters generally: a ' +
        'stable function identity is what lets a memoized child component, or a dependency array elsewhere, ' +
        'treat "the same function" as actually the same across renders instead of re-triggering on every one.',
    },
    {
      question: 'Why is the "reset to loading" logic during render, not inside the fetch `useEffect`?',
      answer:
        'When `debouncedQuery` (or `retryKey`) changes, the UI should show a loading state in the SAME paint ' +
        'the change happens in — that\'s a pure, synchronous derivation from those two values, with no outside ' +
        'system involved, so it belongs in a render-time check (`if (prevSearchKey !== searchKey) { ...setState calls... }`), the same pattern the autocomplete task uses for its cache-hit check. Only the ' +
        'ACTUAL side effect — calling `searchItems`, an operation with a real cleanup/cancellation need — goes ' +
        'in `useEffect`. Doing the state reset inside the effect instead would work, but the loading UI would ' +
        'lag one extra paint behind the query actually changing, and calling `setState` synchronously at the ' +
        'top of an effect is a sign the update belongs during render instead.',
    },
  ],
}

export default content
