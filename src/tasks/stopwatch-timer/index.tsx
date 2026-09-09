import { useEffect, useRef, useState } from 'react'
import styles from './index.module.css'

const TICK_MS = 50

function formatTime(ms: number): string {
  const totalCentis = Math.floor(ms / 10)
  const centis = totalCentis % 100
  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`
}

export default function StopwatchTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])

  // @@ the actual clock, not the tick count, is the source of truth.
  // setInterval(fn, 50) does NOT fire exactly every 50ms — event loop
  // contention and (especially) background-tab throttling make it fire
  // late, and "elapsed += 50" on every tick bakes that drift in permanently.
  // Recomputing from Date.now() every tick self-corrects: a late tick just
  // means a bigger (still accurate) jump in elapsed, not a wrong total.
  const startTimeRef = useRef(0)
  const accumulatedRef = useRef(0)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current)
    }
  }, [])

  const start = () => {
    if (isRunning) return
    startTimeRef.current = Date.now()
    setIsRunning(true)
    intervalRef.current = window.setInterval(() => {
      setElapsed(accumulatedRef.current + (Date.now() - startTimeRef.current))
    }, TICK_MS)
  }

  const pause = () => {
    if (!isRunning) return
    if (intervalRef.current !== undefined) clearInterval(intervalRef.current)
    accumulatedRef.current += Date.now() - startTimeRef.current
    setElapsed(accumulatedRef.current)
    setIsRunning(false)
  }

  const reset = () => {
    if (intervalRef.current !== undefined) clearInterval(intervalRef.current)
    startTimeRef.current = 0
    accumulatedRef.current = 0
    setElapsed(0)
    setIsRunning(false)
    setLaps([])
  }

  const recordLap = () => {
    if (!isRunning) return
    setLaps((prev) => [elapsed, ...prev])
  }

  const canReset = elapsed !== 0 || laps.length > 0

  return (
    <div className={styles.wrapper}>
      <p className={styles.display} aria-live="off">
        {formatTime(elapsed)}
      </p>

      <div className={styles.controls}>
        {!isRunning ? (
          <button type="button" onClick={start} className={styles.primary}>
            {elapsed === 0 ? 'Start' : 'Resume'}
          </button>
        ) : (
          <button type="button" onClick={pause} className={styles.primary}>
            Pause
          </button>
        )}
        <button type="button" onClick={recordLap} disabled={!isRunning}>
          Lap
        </button>
        <button type="button" onClick={reset} disabled={!canReset}>
          Reset
        </button>
      </div>

      {laps.length > 0 && (
        <ol className={styles.laps}>
          {laps.map((lapTime, index) => {
            const lapNumber = laps.length - index
            const previous = laps[index + 1] ?? 0
            const delta = lapTime - previous
            return (
              <li key={lapNumber} className={styles.lapRow}>
                <span>Lap {lapNumber}</span>
                <span className={styles.lapDelta}>+{formatTime(delta)}</span>
                <span>{formatTime(lapTime)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
