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
    // ── fundamentals first — plain-English versions of every concept this
    // task uses, before the scenario-based questions below ──
    {
      question: 'What is state in React (useState)?',
      answer:
        'State is a value a component keeps track of that can change over time and, when it changes, makes ' +
        'the component redraw itself. `const [count, setCount] = useState(0)` gives you `count` (the current ' +
        'value, starting at 0) and `setCount` (the only correct way to change it). Calling `setCount(5)` tells ' +
        'React "this component\'s state is now 5, please re-run it and update the screen" — you never change ' +
        '`count` directly, only through `setCount`.',
    },
    {
      question: 'What is a "controlled component" / controlled input?',
      answer:
        'An input whose displayed value comes entirely from React state, not from the browser\'s own memory of ' +
        'what you typed. You write `value={someState}`, and update `someState` via the input\'s `onChange`. ' +
        'Because the input\'s value is 100% controlled by state, if you forget to update state in `onChange`, ' +
        'the field will look "stuck" — you can type, but nothing changes, because React keeps re-rendering it ' +
        'back to the same old state value.',
    },
    {
      question: 'What is onChange, and what is `e.target.value`?',
      answer:
        '`onChange` is an event handler that React calls every time an input\'s value changes — mainly while ' +
        'typing, but also for checkboxes, selects, etc. React passes the handler an event object `e`; ' +
        '`e.target.value` is the current text sitting in that field at that exact moment (as a string, even ' +
        'for `type="number"` inputs — you usually convert it with `Number(...)`).',
    },
    {
      question: 'What does the "disabled" attribute do on a button?',
      answer:
        'It greys the button out visually AND makes the browser block clicks on it entirely — your `onClick` ' +
        'handler never even runs. It\'s used here on the +/− buttons at the min/max boundary: instead of ' +
        'letting the user click and having clamp() silently do nothing, the button itself visibly tells them ' +
        '"you can\'t go further" before they even try.',
    },
    {
      question: 'What is a "re-render" in React?',
      answer:
        'Whenever state changes (via a `set...` function from `useState`), React calls your component function ' +
        'again to compute what the UI should look like now, then updates only the parts of the actual browser ' +
        'DOM that are different from before. That whole cycle — re-running the function, figuring out what ' +
        'changed, updating the real DOM — is called a re-render.',
    },
    {
      question: 'What does "clamping" a value mean?',
      answer:
        'Restricting a number into a range: if it\'s below the minimum, snap it up to the minimum; if it\'s ' +
        'above the maximum, snap it down to the maximum; otherwise leave it as-is. This component\'s whole ' +
        '`clamp` function is one line: `Math.min(max, Math.max(min, value))` — the inner `Math.max` enforces ' +
        'the floor, the outer `Math.min` enforces the ceiling.',
    },
  ],
}

export default content
