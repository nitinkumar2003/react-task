import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { searchItems, type SearchResult } from './mockApi'
import { useDebouncedValue } from './useDebouncedValue'
import styles from './index.module.css'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AutocompleteTypeahead() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [fromCache, setFromCache] = useState(false)

  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  // @@ this cache used to be a useRef. A ref is for values that DON'T affect
  // what's on screen — but this one does (a cache hit changes what's
  // rendered), and reading ref.current during render is exactly what React
  // warns against: it can give inconsistent results across the multiple
  // render attempts concurrent React is allowed to make. Since it affects
  // rendering, it belongs in state.
  const [cache, setCache] = useState<Map<string, SearchResult[]>>(() => new Map())
  const MAX_CACHE_ENTRIES = 50

  // @@ latest-value ref so the fetch effect below can check "is this already
  // cached?" without listing `cache` in its dependency array — `cache` gets
  // a new Map reference on every successful fetch, which would otherwise
  // make the effect tear down and re-run an extra time after every search.
  const cacheRef = useRef(cache)
  useEffect(() => {
    cacheRef.current = cache
  }, [cache])

  // @@ only the ACTUAL side effect (the network-like call, which needs
  // cleanup/abort) lives in useEffect below. Resetting to idle on an empty
  // query, and serving an already-cached query, are both pure derivations
  // from debouncedQuery + cache — no external system involved — so they're
  // handled here, during render, the same way Counter's boundary-clamp is.
  // This also means the "loading" state (or the cached result) is visible
  // in the very same paint the query settles in, instead of one paint behind.
  const [prevQuery, setPrevQuery] = useState(debouncedQuery)
  if (prevQuery !== debouncedQuery) {
    setPrevQuery(debouncedQuery)
    if (debouncedQuery === '') {
      setResults([])
      setStatus('idle')
      setHighlightedIndex(-1)
      setFromCache(false)
    } else {
      const cached = cache.get(debouncedQuery)
      if (cached) {
        setResults(cached)
        setStatus('success')
        setFromCache(true)
        setHighlightedIndex(-1)
      } else {
        setStatus('loading')
        setResults([]) // don't leave the PREVIOUS query's results on screen while this one loads
        setFromCache(false)
        setHighlightedIndex(-1)
      }
    }
  }

  useEffect(() => {
    if (debouncedQuery === '') return
    if (cacheRef.current.has(debouncedQuery)) return // served from cache above — nothing to fetch

    const controller = new AbortController()

    searchItems(debouncedQuery, controller.signal)
      .then((found) => {
        // @@ belt-and-suspenders: don't rely purely on the promise rejecting
        // on abort. Some real APIs (and simplified test doubles) still
        // resolve a request after it's been aborted — checking the signal
        // ourselves means a stale response can never overwrite fresher
        // results even if that happens.
        if (controller.signal.aborted) return
        setCache((prev) => {
          const next = new Map(prev)
          next.set(debouncedQuery, found)
          // simple bound so a long session's cache doesn't grow forever —
          // evict the oldest entry (Map preserves insertion order)
          if (next.size > MAX_CACHE_ENTRIES) {
            const oldestKey = next.keys().next().value
            if (oldestKey !== undefined) next.delete(oldestKey)
          }
          return next
        })
        setResults(found)
        setStatus('success')
        setHighlightedIndex(-1)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus('error')
      })

    // @@ the actual cancellation: React runs this cleanup BEFORE starting
    // the next effect run (i.e. before the next keystroke's debounced
    // request goes out), so a slow in-flight request for a query the user
    // has already moved past never gets the chance to win a race against a
    // newer one.
    return () => controller.abort()
  }, [debouncedQuery])

  const hasDropdownContent =
    results.length > 0 || status === 'loading' || status === 'error'

  const selectResult = (result: SearchResult) => {
    // @@ pre-seed the cache with the selected label so that when
    // `debouncedQuery` settles to it 300ms from now, it's served from cache
    // instead of firing a spurious background search for a query the user
    // has already finished picking from.
    setCache((prev) => new Map(prev).set(result.label, [result]))
    setQuery(result.label)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && !isOpen) {
      if (hasDropdownContent) setIsOpen(true)
      return
    }
    if (!isOpen) return

    if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
      return
    }

    if (results.length === 0) return // nothing to navigate while loading/error

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) selectResult(results[highlightedIndex])
        break
      default:
        break
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.comboboxRoot}>
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="autocomplete-listbox"
          aria-activedescendant={
            highlightedIndex >= 0 ? `autocomplete-option-${highlightedIndex}` : undefined
          }
          autoComplete="off"
          className={styles.input}
          placeholder="Search countries..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hasDropdownContent) setIsOpen(true)
          }}
          onBlur={() => {
            // small delay so a click on a dropdown option (see onMouseDown
            // below) still lands before we close the list
            setTimeout(() => {
              setIsOpen(false)
              setHighlightedIndex(-1)
            }, 100)
          }}
        />
        {isOpen && status === 'loading' && (
          <span className={styles.spinner} aria-hidden="true" />
        )}
      </div>

      {isOpen && hasDropdownContent && (
        <ul id="autocomplete-listbox" role="listbox" className={styles.dropdown}>
          {status === 'loading' && results.length === 0 && (
            <li className={styles.statusRow}>Searching…</li>
          )}
          {status === 'error' && (
            <li className={styles.statusRow} role="alert">
              Something went wrong. Try again.
            </li>
          )}
          {results.map((result, index) => (
            <li
              key={result.id}
              id={`autocomplete-option-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              className={
                index === highlightedIndex ? styles.optionActive : styles.option
              }
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectResult(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {result.label}
            </li>
          ))}
        </ul>
      )}

      {isOpen && status === 'success' && results.length === 0 && (
        <p className={styles.emptyHint}>No results for "{debouncedQuery}"</p>
      )}
      {isOpen && fromCache && status === 'success' && (
        <p className={styles.cacheHint}>Loaded from cache — no request made.</p>
      )}
    </div>
  )
}
