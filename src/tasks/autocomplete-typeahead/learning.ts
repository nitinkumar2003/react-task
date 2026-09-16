import type { LearningContent } from '../learning-types'

const content: LearningContent = {
  summary:
    'Type-ahead search: debounce the input, fetch from a (mocked) API, cancel a request if the user keeps ' +
    'typing before it comes back, cache results so repeat queries are instant, and support full keyboard ' +
    'navigation. The one bug worth remembering: a slow response for an OLD query can arrive AFTER a fast ' +
    'response for a NEWER query — without actively cancelling/ignoring the stale one, it silently overwrites ' +
    'the correct, already-displayed results. A test that resolves the "old" request last (deliberately out of ' +
    'order) catches this; a test that always resolves requests in the order they were sent does not.',

  concepts: [
    'debouncing (delaying work until input goes quiet)',
    'AbortController / AbortSignal',
    'race conditions between async requests',
    'useEffect cleanup for cancelling in-flight work',
    'caching with a Map',
    'adjusting state during render vs. in an effect',
    'keyboard event handling (onKeyDown, preventDefault)',
    'ARIA combobox/listbox roles',
    'useRef as a "latest value" mirror to avoid an unwanted effect dependency',
  ],

  codeSnippets: [
    {
      title: '1. Debouncing — a small reusable hook',
      code: `export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}

// usage:
const debouncedQuery = useDebouncedValue(query.trim(), 300)
// query updates on every keystroke; debouncedQuery only updates once
// typing has paused for 300ms`,
      explanation:
        'Every time `value` changes (every keystroke), the effect schedules a timeout AND cleans up the ' +
        'previous one first. So if you type 5 characters within 300ms, 5 timeouts get scheduled and 4 of them ' +
        'get cancelled before they ever fire — only the timeout scheduled by the LAST keystroke survives to ' +
        'actually run and update `debounced`. That\'s the entire mechanism: rapid changes keep cancelling each ' +
        'other\'s pending update, and only silence for `delayMs` lets one through.',
    },
    {
      title: '2. The bug: a stale response can overwrite a fresh one',
      code: `// BAD — applies whatever result comes back, whenever it comes back,
// with no check on whether it's still relevant:
useEffect(() => {
  searchItems(debouncedQuery).then((found) => {
    setResults(found)   // could be for a query the user has since changed
  })
}, [debouncedQuery])

// what actually happens with two in-flight requests:
// 1. type "india"      -> request A sent (slow — takes 800ms)
// 2. type "indonesia"  -> request B sent (fast — takes 200ms)
// 3. [200ms later] request B resolves -> setResults(indonesia results)  ✓ correct
// 4. [800ms later] request A resolves -> setResults(india results)     ✗ WRONG
//    the screen now shows results for "india" while the input still says "indonesia"`,
      explanation:
        'This is the single most common bug in real autocomplete implementations, and it only shows up under ' +
        'exactly the wrong conditions to catch by hand-testing: it requires an OLDER request to resolve AFTER ' +
        'a NEWER one, which is timing-dependent and won\'t reproduce reliably on a fast local network. A test ' +
        'that controls exactly when each mocked request resolves (resolving the older one last, on purpose) ' +
        'catches it deterministically, every time — real-time testing by hand basically never will.',
    },
    {
      title: '3. The fix — AbortController, wired through useEffect cleanup',
      code: `useEffect(() => {
  const controller = new AbortController()

  searchItems(debouncedQuery, controller.signal)
    .then((found) => {
      if (controller.signal.aborted) return   // belt-and-suspenders (see below)
      setResults(found)
      setStatus('success')
    })
    .catch((err) => {
      if (controller.signal.aborted) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      setStatus('error')
    })

  // React calls this BEFORE the next effect run — i.e. before request B's
  // useEffect body executes, request A's controller.abort() has already run
  return () => controller.abort()
}, [debouncedQuery])`,
      explanation:
        'Every time `debouncedQuery` changes, React does three things in order: (1) run this effect\'s cleanup ' +
        'function from the PREVIOUS run, (2) run the new effect body. So the instant "indonesia" becomes the ' +
        'debounced query, "india"\'s controller.abort() fires — before "indonesia"\'s request is even sent. A ' +
        'well-behaved fetch honors that abort signal and rejects instead of resolving, so "india"\'s `.then` ' +
        'never runs at all, and it can never call setResults with stale data.',
    },
    {
      title: '4. Defense in depth — checking the signal even inside .then()',
      code: `.then((found) => {
  if (controller.signal.aborted) return   // <-- this line
  setResults(found)
})`,
      explanation:
        'Relying ONLY on the promise rejecting is fragile: some real APIs, and definitely some simplified test ' +
        'doubles / mocks, don\'t actually honor AbortSignal — they resolve normally no matter what. Checking ' +
        '`controller.signal.aborted` directly before applying the result means the component is correct ' +
        'regardless of whether the thing on the other end of `searchItems` behaves perfectly. This is exactly ' +
        'the check that made the "stale response arrives late" test in this task pass deterministically, ' +
        'independent of whether the mock even simulates rejection.',
    },
    {
      title: '5. Caching — and why it\'s state, not a ref',
      code: `// a cache HIT changes what's rendered, so it has to be state, not a ref
// (reading ref.current during render is unsafe — see the Counter task too)
const [cache, setCache] = useState<Map<string, SearchResult[]>>(() => new Map())

// render-time: if this query's already in the cache, use it immediately —
// no loading state, no request
const cached = cache.get(debouncedQuery)
if (cached) {
  setResults(cached)
  setStatus('success')
}

// after a successful fetch, add to the cache immutably:
setCache((prev) => new Map(prev).set(debouncedQuery, found))`,
      explanation:
        'A cache built with `useRef` would work in the sense that the DATA is stored correctly — but reading ' +
        '`ref.current` during render is something React explicitly warns against, because a ref is mutable ' +
        'and doesn\'t participate in React\'s render-consistency guarantees. Since a cache hit visibly changes ' +
        'what\'s on screen, it genuinely is part of the UI\'s state, so it belongs in `useState` — updated ' +
        'immutably (a new `Map`, not `cache.current.set(...)` in place) so React can detect the change.',
    },
    {
      title: '6. useRef as a "latest value" mirror — avoiding a dependency that churns',
      code: `const [cache, setCache] = useState<Map<string, SearchResult[]>>(() => new Map())

// mirror the latest cache into a ref, kept in sync via its own tiny effect
const cacheRef = useRef(cache)
useEffect(() => {
  cacheRef.current = cache
}, [cache])

useEffect(() => {
  if (cacheRef.current.has(debouncedQuery)) return   // read the MIRROR, not \`cache\`
  // ...fetch...
}, [debouncedQuery])   // <-- cache is NOT a dependency`,
      explanation:
        '`setCache` creates a brand-new Map on every successful fetch (immutable update, so React can see the ' +
        'change). If the fetch effect listed `cache` in its dependency array just to call `.has()` on it, ' +
        'every successful fetch would itself cause that new Map reference to make the effect tear down and ' +
        'run again — cleanup calls `abort()` on an already-settled controller, then the new run immediately ' +
        'bails via the cache check. Harmless today, but wasted work, and a landmine if the effect ever grows a ' +
        'real side effect. A ref always exposes `.current` as the latest value without being "reactive" — ' +
        'writing to it doesn\'t trigger a re-render or count as a dependency — so mirroring `cache` into ' +
        '`cacheRef` via its own effect lets the fetch effect depend on `debouncedQuery` alone.',
    },
  ],

  interviewQuestions: [
    {
      question: 'What is debouncing?',
      answer:
        'Delaying an action until a burst of triggering events has stopped happening for a bit. For a search ' +
        'box: instead of firing a request on every single keystroke, wait until the user has stopped typing ' +
        'for, say, 300ms, THEN fire one request for whatever they ended up typing. If they keep typing, the ' +
        'wait keeps resetting.',
    },
    {
      question: 'What is AbortController, and what is an AbortSignal?',
      answer:
        'Built-in browser APIs for cancelling an in-progress asynchronous operation, most commonly a `fetch()` ' +
        'call. `const controller = new AbortController()` gives you `controller.signal` (an AbortSignal you ' +
        'pass into the operation you want to be cancellable, e.g. `fetch(url, { signal: controller.signal })`) ' +
        'and `controller.abort()` (which you call later to actually cancel it — this makes a well-behaved ' +
        'fetch reject instead of resolving).',
    },
    {
      question: 'What is a "race condition"?',
      answer:
        'A bug that only happens depending on the ORDER or TIMING in which two things finish, when you assumed ' +
        'a particular order but didn\'t guarantee it. Here: two search requests are in flight (for two ' +
        'different, successive queries), and nothing forces the one sent first to also finish first — a race ' +
        'condition is when whichever one happens to "win" (finish last and thus overwrite the screen) produces ' +
        'the wrong result.',
    },
    {
      question: 'What is useEffect cleanup, in plain terms?',
      answer:
        'The function you `return` from inside a `useEffect` callback. React calls it automatically right ' +
        'before running that effect again (because its dependencies changed) or right before the component is ' +
        'removed from the screen. It\'s where you undo whatever the effect set up — here, that\'s cancelling ' +
        'the network request the effect started.',
    },
    {
      question: 'What does "caching" mean here, and why use a Map for it?',
      answer:
        'Caching means remembering the answer to a question you\'ve already asked, so you can reuse it instead ' +
        'of asking again. A `Map` is a JavaScript key-value collection — `cache.get("india")` and ' +
        '`cache.set("india", results)` — a natural fit for "given this search text, what were the results?". ' +
        'It also preserves insertion order and allows any type as a key, unlike a plain object where keys get ' +
        'coerced to strings.',
    },
    {
      question: 'What does preventDefault() do, and why is it called on ArrowDown/ArrowUp here?',
      answer:
        '`e.preventDefault()` inside an event handler stops the browser\'s own default behavior for that event ' +
        'from happening. For an `<input>`, the arrow keys normally move the text cursor left/right (for ' +
        'ArrowLeft/Right) — ArrowUp/Down don\'t usually do much in a plain text input, but in some contexts ' +
        '(or with certain input types) they can. Calling `preventDefault()` here makes sure the only thing ' +
        'ArrowDown/ArrowUp do is move the highlighted suggestion, with no competing browser behavior.',
    },
    {
      question: 'What is the "combobox" and "listbox" ARIA role, and why bother with them?',
      answer:
        'ARIA roles tell assistive technology (like screen readers) what a group of plain HTML elements is ' +
        'actually meant to behave like, when the visual/interactive behavior isn\'t something a native HTML ' +
        'element already provides. `role="combobox"` on the input and `role="listbox"`/`role="option"` on the ' +
        'suggestion list tell a screen reader "this is a search box with a list of selectable suggestions", so ' +
        'it can announce things like how many options there are and which one is currently highlighted — ' +
        'information a sighted user gets for free just by looking at the highlighted row.',
    },
    {
      question: 'What is `useRef`, and how is it different from `useState`?',
      answer:
        'Both persist a value across re-renders of the same component instance. The difference: `setState` ' +
        'schedules a re-render and the new value is only reliably visible on the NEXT render; `ref.current` ' +
        'can be read and written at any time, immediately, and changing it does NOT trigger a re-render. Rule ' +
        'of thumb: if a value is supposed to change what\'s on screen, it\'s state. If it\'s just a place to ' +
        'stash the latest value of something for imperative code (an effect, an event handler) to read later ' +
        'without caring about re-rendering, it\'s a ref — like `cacheRef` here, which exists only so the fetch ' +
        '`useEffect` can read the current cache without that Map reference becoming a dependency.',
    },
  ],
}

export default content
