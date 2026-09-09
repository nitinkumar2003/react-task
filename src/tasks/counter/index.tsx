import { useState, type ChangeEvent } from 'react'
import { useNumberField } from './useNumberField'
import styles from './index.module.css'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export default function Counter() {
  const minField = useNumberField(0)
  const maxField = useNumberField(10)
  const stepField = useNumberField(1)
  const min = minField.value
  const max = maxField.value
  const step = Math.max(1, stepField.value || 1)

  const [count, setCount] = useState(0)

  // @@ keep count inside [min, max] whenever the bounds themselves change —
  // e.g. dragging max below the current count shouldn't leave count stranded
  // out of range. This used to be a useEffect watching [min, max], but that's
  // React's "derive state, then immediately setState in an effect" anti-
  // pattern — it renders once with the stale count, THEN fires the effect,
  // THEN renders again with the corrected count (a visible extra pass, and
  // exactly what oxlint's react(set-state-in-effect) rule flags). Adjusting
  // state directly during render — React's documented escape hatch for this
  // exact case — corrects it before the first paint instead.
  const [prevBounds, setPrevBounds] = useState({ min, max })
  if (prevBounds.min !== min || prevBounds.max !== max) {
    setPrevBounds({ min, max })
    setCount((prev) => clamp(prev, min, max))
  }

  const isInvalidRange = min > max
  const atMax = !isInvalidRange && count >= max
  const atMin = !isInvalidRange && count <= min

  const increment = () => {
    if (isInvalidRange) return
    // functional update — rapid clicks each read the *latest* count, so ten
    // fast clicks land exactly where ten clicks should, no lost updates
    setCount((prev) => clamp(prev + step, min, max))
  }

  const decrement = () => {
    if (isInvalidRange) return
    setCount((prev) => clamp(prev - step, min, max))
  }

  const reset = () => setCount(clamp(0, min, max))

  const handleDirectInput = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      setCount(min)
      return
    }
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) return // ignore garbage keystrokes, keep last valid count
    // deliberately NOT clamped here — clamping on every keystroke would make it
    // impossible to type "10" into a [0,10] field (the "1" alone would clamp away)
    setCount(parsed)
  }

  const handleBlur = () => setCount((prev) => clamp(prev, min, max))

  return (
    <div className={styles.wrapper}>
      <div className={styles.bounds}>
        <label>
          Min
          <input
            type="text"
            inputMode="numeric"
            value={minField.draft}
            onChange={minField.onChange}
            onBlur={minField.onBlur}
          />
        </label>
        <label>
          Max
          <input
            type="text"
            inputMode="numeric"
            value={maxField.draft}
            onChange={maxField.onChange}
            onBlur={maxField.onBlur}
          />
        </label>
        <label>
          Step
          <input
            type="text"
            inputMode="numeric"
            value={stepField.draft}
            onChange={stepField.onChange}
            onBlur={stepField.onBlur}
          />
        </label>
      </div>

      {isInvalidRange && (
        <p className={styles.warning} role="alert">
          Min can't be greater than max — counter disabled.
        </p>
      )}

      <div className={styles.counterRow}>
        <button
          type="button"
          onClick={decrement}
          disabled={isInvalidRange || atMin}
          aria-label="Decrement"
        >
          −
        </button>
        <input
          className={styles.countInput}
          type="number"
          value={count}
          onChange={handleDirectInput}
          onBlur={handleBlur}
          disabled={isInvalidRange}
          aria-label="Count"
        />
        <button
          type="button"
          onClick={increment}
          disabled={isInvalidRange || atMax}
          aria-label="Increment"
        >
          +
        </button>
      </div>

      <button type="button" onClick={reset} className={styles.resetButton}>
        Reset
      </button>
    </div>
  )
}
