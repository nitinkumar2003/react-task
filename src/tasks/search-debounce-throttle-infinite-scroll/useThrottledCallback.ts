import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a throttled version of `callback`: the first call runs
 * immediately, further calls within `delayMs` are dropped, and — unlike a
 * naive "drop everything until the window ends" throttle — the LAST call
 * made during that window still fires once, at the end of it (trailing
 * edge), so the final scroll position always gets checked.
 */
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const lastRunAtRef = useRef(0)
  const trailingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(trailingTimeoutRef.current), [])

  return useCallback(
    (...args: Args) => {
      const now = Date.now()
      const elapsed = now - lastRunAtRef.current

      clearTimeout(trailingTimeoutRef.current)

      if (elapsed >= delayMs) {
        lastRunAtRef.current = now
        callback(...args)
      } else {
        trailingTimeoutRef.current = setTimeout(() => {
          lastRunAtRef.current = Date.now()
          callback(...args)
        }, delayMs - elapsed)
      }
    },
    [callback, delayMs],
  )
}
