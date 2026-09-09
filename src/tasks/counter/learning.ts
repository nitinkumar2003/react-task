import type { LearningContent } from '../learning-types'

const content: LearningContent = {
  summary:
    'A counter that looks trivial until you actually enumerate the edge cases: configurable min/max/step, ' +
    'buttons disabled at boundaries, an editable count field, and rapid clicks. The interesting bug wasn\'t in ' +
    'the increment/decrement logic at all — it was in how the min/max/step *inputs themselves* were wired up, ' +
    'and a test caught it: clearing a bound field to retype it briefly commits 0, which permanently clamped ' +
    'the count before the real number was even finished typing. Fixed with a small reusable hook that buffers ' +
    'the input\'s displayed text separately from the committed numeric value.',

  concepts: [
    'useState',
    'adjusting state during render (not useEffect)',
    'custom hook (useNumberField)',
    'functional setState updates',
    'controlled inputs',
    'clamping / boundary logic',
    'accessibility (aria-label, role="alert")',
  ],

  codeSnippets: [
    {
      title: '1. The bug: a naive controlled number input destroys state mid-edit',
      code: `// BAD — commits on every keystroke, including the empty string while retyping
<input
  type="number"
  value={max}
  onChange={(e) => setMax(Number(e.target.value))}
/>

// user backspaces "10" to retype "5":
// keystroke 1: field is now ""      -> Number('') === 0  -> setMax(0)
// effect fires: setCount(clamp(prev, min, 0))  -> count permanently drops to 0
// keystroke 2: field is now "5"     -> setMax(5)
// effect fires again, but count is already 0 and stays 0 — the original
// count is gone, even though the user only ever *meant* to set max to 5`,
      explanation:
        'This only shows up when something else reacts to the value the moment it changes — a lone ' +
        'controlled input with no downstream effect would "self-heal" the instant you finish typing. Here, ' +
        'the min/max-clamp effect reacts on every intermediate value too, including the throwaway 0 that ' +
        'exists for a few milliseconds between keystrokes. A unit test that used user.clear() + user.type() ' +
        '(simulating a real person editing the field) caught this immediately; a test that just fired one ' +
        'change event with the final value would have missed it completely.',
    },
    {
      title: '2. The fix — buffer the displayed text, commit only valid numbers',
      code: `export function useNumberField(initial: number) {
  const [value, setValue] = useState(initial)       // the real, committed number
  const [draft, setDraft] = useState(String(initial)) // whatever's currently typed

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)                    // always reflect what the user typed
    if (raw.trim() === '') return    // "" is not a number — don't commit it
    const parsed = Number(raw)
    if (!Number.isNaN(parsed)) setValue(parsed)
  }

  const onBlur = () => setDraft(String(value)) // snap back if they abandoned a bad edit

  return { value, draft, onChange, onBlur }
}

// usage:
const maxField = useNumberField(10)
<input value={maxField.draft} onChange={maxField.onChange} onBlur={maxField.onBlur} />
// ...downstream code reads maxField.value, never maxField.draft`,
      explanation:
        'Two pieces of state instead of one: what\'s on screen (`draft`, always a string, always mirrors ' +
        'the DOM) versus what\'s real (`value`, only ever a valid number). They\'re allowed to disagree ' +
        'temporarily — that\'s the whole point. Everything else in the component (the clamp logic, the ' +
        'boundary checks) reads `value`, so a transient "" in the input never leaks into logic that reacts ' +
        'to real changes. This is the standard fix for *any* controlled numeric/date/masked input where ' +
        '"partially typed" and "invalid" need to be visually distinguishable from "committed".',
    },
    {
      title: '3. Clamping — one function, reused for every boundary case',
      code: `const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// increment — clamps so a step larger than remaining headroom lands
// exactly on max instead of overshooting it:
const increment = () => {
  if (isInvalidRange) return
  setCount((prev) => clamp(prev + step, min, max))
}

// bounds changing (e.g. max dragged below current count) — re-clamp
// whatever count already is (see snippet 4 for why this ISN'T a useEffect):
const [prevBounds, setPrevBounds] = useState({ min, max })
if (prevBounds.min !== min || prevBounds.max !== max) {
  setPrevBounds({ min, max })
  setCount((prev) => clamp(prev, min, max))
}`,
      explanation:
        'One tiny pure function handles three different-looking edge cases: overshoot on increment/decrement, ' +
        'a step size bigger than the remaining room to the boundary, and bounds moving underneath an existing ' +
        'count. Writing three separate ad-hoc "if too big, set to max" checks in three places is exactly how ' +
        'this kind of logic drifts out of sync when one of them gets edited later and the others don\'t.',
    },
    {
      title: '4. Adjusting state during render, instead of useEffect + setState',
      code: `// BAD — this is what the clamp logic looked like at first, and oxlint's
// react(set-state-in-effect) rule flags exactly this shape:
useEffect(() => {
  setCount((prev) => clamp(prev, min, max))
}, [min, max])
// render 1: min/max just changed, count is still the OLD value (stale paint)
// (effect runs after paint)
// render 2: count is now clamped — the correct value shows up a beat late

// GOOD — React's documented pattern for "derive state from a prop/value
// change, and correct it before the user ever sees the stale version":
const [prevBounds, setPrevBounds] = useState({ min, max })
if (prevBounds.min !== min || prevBounds.max !== max) {
  setPrevBounds({ min, max })                       // update the "last seen" snapshot
  setCount((prev) => clamp(prev, min, max))          // correct count in the SAME render pass
}
// React sees setState was called mid-render, throws away this render's
// output, and re-renders immediately with both values already correct —
// before anything reaches the screen. No stale paint, no extra effect.`,
      explanation:
        'This looks unusual the first time you see it — calling setState while a component is rendering feels ' +
        'like it should be illegal. It\'s explicitly supported by React specifically for this case: "adjust ' +
        'state based on a change in props" without the render→paint→effect→re-render round trip a useEffect ' +
        'costs you. The `prevBounds` comparison is required — without checking "did min/max actually change ' +
        'since last render" first, this would setState on literally every render and loop forever. This is a ' +
        'narrow escape hatch, not a general replacement for useEffect: it\'s only appropriate when you\'re ' +
        'purely deriving/correcting state from something else, with no actual side effect (network call, ' +
        'subscription, DOM manipulation) involved.',
    },
  ],

  interviewQuestions: [
    {
      question:
        'Walk through what happens, step by step, when a user backspaces "10" and types "5" into a plain `<input value={max} onChange={e => setMax(Number(e.target.value))}>` that feeds a clamp effect.',
      answer:
        'Backspacing to empty fires an onChange with `e.target.value === \'\'`. `Number(\'\')` is `0`, not NaN, ' +
        'so `setMax(0)` actually commits. Any effect with `max` in its dependency array re-runs immediately ' +
        'with `max = 0` — in this component, that\'s the clamp effect, which pulls `count` down to whatever ' +
        '`clamp(count, min, 0)` is (likely 0). Then the user types "5": onChange fires again with `Number(\'5\') ' +
        '=== 5`, `setMax(5)` commits, the effect reruns with the real target value — but `count` was already ' +
        'destroyed by the intermediate `0` and has no way to recover the number it held before the edit started.',
    },
    {
      question:
        'Why does buffering the input\'s text in separate state (draft vs. value) fix this, instead of e.g. adding a guard like `if (e.target.value !== \'\') setMax(...)`?',
      answer:
        'That guard alone actually does fix *this specific* bug (it stops the 0 from ever committing) — but ' +
        'it leaves the input semi-broken: if the field only commits on valid numbers, an `<input value={max}>` ' +
        'bound directly to the numeric state would refuse to visually go blank at all, since React re-renders ' +
        'it with the old `max` on every keystroke that doesn\'t parse. You\'d never be able to clear the box to ' +
        'retype in the first place — the last character would keep "snapping back". The draft/value split ' +
        'fixes both problems at once: the input always shows literally what was typed (even "", even "-"), ' +
        'and downstream logic only ever sees fully-committed numbers.',
    },
    {
      question:
        'Why is `setCount(prev => clamp(prev + step, min, max))` used instead of `setCount(clamp(count + step, min, max))`?',
      answer:
        'The functional form reads the *actual latest* state at the moment React applies the update, not ' +
        'whatever `count` happened to be when the click handler was created. If a user clicks Increment ' +
        'several times in quick succession (or two updates get batched together), each functional update ' +
        'chains off the previous one\'s result — nothing gets lost. `setCount(clamp(count + step, ...))` ' +
        'closes over `count` from the render the click handler was created in; if two clicks somehow got ' +
        'processed before a re-render reflected the first one, the second click would compute from stale data.',
    },
    {
      question:
        'The clamp-on-bounds-change logic used to be `useEffect(() => setCount(clamp(...)), [min, max])`. What\'s actually wrong with that, and what replaced it?',
      answer:
        'It works, but pays for a round trip it doesn\'t need: React commits a render with the OLD (now stale) ' +
        'count, paints it, THEN runs the effect, which calls setState, which triggers a second render that ' +
        'finally shows the corrected count. For a fraction of a second the user can see an out-of-range number ' +
        'flash on screen. It\'s also exactly the shape oxlint\'s `react(set-state-in-effect)` rule exists to ' +
        'catch — "setState synchronously inside an effect" is a strong signal the value should\'ve been derived ' +
        'during render instead. The replacement compares `min`/`max` against a `prevBounds` snapshot kept in ' +
        'state, and if they differ, calls `setCount` *during* the render itself (not in an effect). React ' +
        'detects the mid-render setState, discards that render\'s output, and immediately re-renders with the ' +
        'corrected value — so the corrected count is what actually reaches the screen, with no stale flash and ' +
        'no extra effect pass.',
    },
    {
      question:
        'The increment/decrement buttons get `disabled` when at the boundary — why not just let clamp() silently absorb clicks past the limit instead of disabling the button?',
      answer:
        'Functionally, clamp() alone is enough to prevent the count from going out of range — clicking ' +
        '"+" at max would just clamp back to max, a no-op. But an enabled button that does nothing is a ' +
        'usability smell: it invites another click, tells the user nothing, and fails basic accessibility ' +
        'expectations (a screen reader user gets no signal that they\'ve hit a wall). `disabled` communicates ' +
        'the boundary directly through the UI instead of making the user discover it by trial and error.',
    },
    {
      question:
        'What happens if min > max (e.g. someone sets min to 20 while max is still 10)? Why disable the whole control instead of, say, swapping min and max automatically?',
      answer:
        'Auto-swapping is tempting but creates a worse problem: the moment min and max cross, whichever field ' +
        'the user is actively mid-edit in would start jumping to a value they didn\'t type, fighting their ' +
        'cursor. This component instead treats min > max as an explicit invalid-configuration state: both ' +
        'buttons disable, and a `role="alert"` message explains why — same instinct as the disabled-button ' +
        'answer above, surfaced through the UI rather than silently "fixed" behind the user\'s back.',
    },
    {
      question:
        'The count field itself (not min/max/step) uses a different pattern — it clamps only on blur, not via the draft/value split. Why not reuse useNumberField for it too?',
      answer:
        'useNumberField solves "don\'t let a transient invalid string leak into other logic" — which is ' +
        'exactly the min/max/step problem. The count field has a different requirement: it *is* allowed to ' +
        'temporarily hold an out-of-range value while typing (e.g. typing "10" digit-by-digit into a [0,10] ' +
        'field passes through "1" first, which is in range, so that particular field is less exposed — but ' +
        'typing into a [0,5] field the same way would pass through "10" as an intermediate value before ' +
        'backspacing). It intentionally does NOT clamp until blur, specifically so multi-digit typing isn\'t ' +
        'fought at every keystroke, then corrects on blur. Same philosophy (don\'t punish an in-progress ' +
        'edit), different mechanism, because the two fields have different jobs — one just needs to hold a ' +
        'valid number, the other needs to hold a number that stays *inside a range* by the time you\'re done.',
    },
  ],
}

export default content
