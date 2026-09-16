import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThrottledCallback } from './useThrottledCallback'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useThrottledCallback', () => {
  it('fires the first call immediately (positive)', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(fn, 200))

    act(() => result.current('a'))

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('drops calls inside the throttle window, but still fires once at the end with the latest args (positive)', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(fn, 200))

    act(() => result.current('first'))
    expect(fn).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(50)
      result.current('second')
      vi.advanceTimersByTime(50)
      result.current('third')
    })
    // 100ms in: neither "second" nor "third" fired yet, only the trailing one is pending
    expect(fn).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(100)) // window fully elapses
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })

  it('a call made after the throttle window has fully elapsed fires immediately again (edge case)', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(fn, 200))

    act(() => result.current('a'))
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current('b'))

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('never calls the callback if the throttled function is never invoked (negative)', () => {
    const fn = vi.fn()
    renderHook(() => useThrottledCallback(fn, 200))

    act(() => vi.advanceTimersByTime(1000))

    expect(fn).not.toHaveBeenCalled()
  })
})
