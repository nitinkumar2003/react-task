import { useState, type ChangeEvent } from 'react'

/**
 * A number input that's pleasant to type into.
 *
 * @@ bug this fixes: a plain `<input type="number" value={min} onChange={e =>
 * setMin(Number(e.target.value))}>` commits on every keystroke — so clearing
 * the field to retype it briefly commits `Number('') === 0`. If anything else
 * derives from that value the moment it changes (like Counter's
 * clamp-count-to-[min,max] effect), the 0 does real, permanent damage before
 * you've even finished typing the number you meant to enter.
 *
 * Fix: keep the input's displayed text as its own state ("draft"). Only push
 * a *parsed, valid* number into the committed value. An empty or partial
 * draft ("", "-") just sits there on screen without touching anything else.
 * On blur, snap the draft back to match whatever actually committed, so an
 * abandoned bad edit doesn't linger looking like it "took".
 */
export function useNumberField(initial: number) {
  const [value, setValue] = useState(initial)
  const [draft, setDraft] = useState(String(initial))

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)
    if (raw.trim() === '') return
    const parsed = Number(raw)
    if (!Number.isNaN(parsed)) setValue(parsed)
  }

  const onBlur = () => setDraft(String(value))

  return { value, draft, onChange, onBlur }
}
