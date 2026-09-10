import type { LearningContent } from '../learning-types'

const content: LearningContent = {
  summary:
    'Start/pause/resume/reset with lap tracking. The one rule that shapes the whole implementation: never trust ' +
    'the interval tick count as the clock. setInterval(fn, 50) is a *request*, not a guarantee — the browser can ' +
    'fire it late (busy main thread, background-tab throttling), and if you respond to every tick with ' +
    '"elapsed += 50" that lateness becomes permanent drift, compounding tick after tick. Instead, two refs ' +
    '(startTime, accumulated) plus a single Date.now() read per tick recompute the true elapsed time from ' +
    'scratch every time — a late tick just means a bigger, still-correct jump.',

  concepts: [
    'useState',
    'useRef (values that must NOT trigger re-renders)',
    'useEffect cleanup (clearInterval on unmount)',
    'setInterval / clearInterval',
    'Date.now() for drift-free timing',
    'derived formatting function (pure, no state)',
    'guard clauses against double-start / double-pause',
  ],

  codeSnippets: [
    {
      title: '1. The bug this avoids: accumulating by tick count drifts',
      code: `// BAD — assumes every tick is exactly 50ms apart. It never is.
const [elapsed, setElapsed] = useState(0)
setInterval(() => {
  setElapsed((prev) => prev + 50)   // "trust" the interval's timing
}, 50)

// GOOD — the interval is just a signal to re-check the real clock:
setInterval(() => {
  setElapsed(accumulatedRef.current + (Date.now() - startTimeRef.current))
}, 50)`,
      explanation:
        'In the BAD version, if a tick actually fires at 63ms instead of 50ms (main thread was busy, or the ' +
        'tab was backgrounded and the browser throttled timers to once a second — a real Chrome behavior), ' +
        'the displayed time is now 13ms behind reality, forever — the next tick adds another 50 on top of an ' +
        'already-wrong number. Over a few minutes of a busy page or a backgrounded tab this becomes seconds of ' +
        'drift. The GOOD version never accumulates error: every single tick recomputes elapsed from an actual ' +
        'wall-clock timestamp, so a late tick just means that one frame shows a slightly bigger jump — the ' +
        'number itself is always exactly right.',
    },
    {
      title: '2. Why two refs (startTime + accumulated) instead of one number in state',
      code: `const startTimeRef = useRef(0)      // Date.now() at the moment "start"/"resume" was clicked
const accumulatedRef = useRef(0)    // total elapsed time banked from all PREVIOUS runs

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
  clearInterval(intervalRef.current)
  accumulatedRef.current += Date.now() - startTimeRef.current  // bank this run's time
  setElapsed(accumulatedRef.current)
  setIsRunning(false)
}`,
      explanation:
        'A stopwatch is really "time banked from past runs" + "time elapsed in the current run". `accumulated` ' +
        'is the bank; `startTime` marks when the current run began. Pausing folds the current run into the bank ' +
        'and stops. Resuming just records a fresh `startTime` — `accumulated` is untouched, so the next tick\'s ' +
        '`accumulated + (now - startTime)` naturally continues from where it left off. These live in refs, not ' +
        'state, on purpose: changing them should never itself trigger a re-render — only `setElapsed` (called ' +
        'from inside the interval) should. Refs are the right tool whenever a value needs to persist across ' +
        'renders but isn\'t, itself, something the UI directly reads.',
    },
    {
      title: '3. Cleanup — the interval must not outlive the component',
      code: `useEffect(() => {
  return () => {
    if (intervalRef.current !== undefined) clearInterval(intervalRef.current)
  }
}, [])`,
      explanation:
        'If the component unmounts while running (user navigates away mid-stopwatch) without this cleanup, the ' +
        'interval keeps firing in the background, calling setElapsed on a component that no longer exists — ' +
        'wasted work forever, and in React versions/setups where that\'s flagged, a "can\'t update state on an ' +
        'unmounted component" warning. The empty dependency array is deliberate: this effect\'s only job is ' +
        'the unmount cleanup, it has nothing to *re-run* for.',
    },
    {
      title: '4. Testing an interval-driven component without waiting in real time',
      code: `beforeEach(() => {
  // fake only Date + interval timers — leave requestAnimationFrame/
  // MessageChannel/queueMicrotask real, or React 18's scheduler (which
  // userEvent's act()-wrapped clicks depend on) hangs waiting on them
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
})

it('accumulates elapsed time from wall-clock deltas', async () => {
  const user = userEvent.setup({ delay: null }) // no real waiting in userEvent either
  render(<StopwatchTimer />)
  await user.click(screen.getByRole('button', { name: 'Start' }))

  act(() => { vi.advanceTimersByTime(1000) })   // instantly "1 second later"

  expect(screen.getByText('00:01.00')).toBeInTheDocument()
})`,
      explanation:
        'First attempt at this test used the default `vi.useFakeTimers()`, which fakes *everything* timing-' +
        'related including requestAnimationFrame and MessageChannel — and every single test timed out at 5s. ' +
        'React 18\'s scheduler uses those APIs internally to flush updates, so faking them starves React of the ' +
        'ability to process the click at all. The fix: only fake the specific APIs the component itself uses ' +
        '(`Date`, `setInterval`/`clearInterval`), and pass `{ delay: null }` to userEvent so it doesn\'t try to ' +
        'wait in real time between simulated pointer events either. This is a genuinely common gotcha the first ' +
        'time you test anything time-based in React — worth remembering on its own.',
    },
  ],

  interviewQuestions: [
    // ── fundamentals first — the plain-English version of every concept
    // this task uses, before the scenario-based questions below that
    // assume you already know these ──
    {
      question: 'What is useState?',
      answer:
        'A React Hook that lets a component "remember" a value between renders, and re-render itself ' +
        'whenever that value changes. `const [elapsed, setElapsed] = useState(0)` — `elapsed` is the current ' +
        'value (starts at 0), `setElapsed` is the only way to change it. Calling `setElapsed(newValue)` tells ' +
        'React "re-run this component with the new value" — that re-run is what actually updates what you see ' +
        'on screen.',
    },
    {
      question: 'What is useRef, and how is it different from useState?',
      answer:
        'Both let a value survive across re-renders (a plain variable inside the component would reset every ' +
        'time). The difference: changing a ref does NOT cause a re-render, and you read/write it through ' +
        '`.current` (`myRef.current`) instead of a `[value, setValue]` pair. Rule of thumb: if the value ' +
        'should show up on screen, use `useState`. If it\'s just bookkeeping the component needs to remember ' +
        '(like "which interval is currently running" or "what timestamp did we start at"), use `useRef` — ' +
        'this stopwatch uses refs for exactly that reason (see the questions below).',
    },
    {
      question: 'What is setTimeout?',
      answer:
        'A built-in JavaScript function that runs a piece of code ONCE, after waiting a given number of ' +
        'milliseconds. `setTimeout(() => console.log(\'hi\'), 1000)` waits about 1 second, prints "hi", and ' +
        'then it\'s done — it does not repeat.',
    },
    {
      question: 'What is setInterval, and how is it different from setTimeout?',
      answer:
        'Same idea as `setTimeout`, but it repeats — it keeps running the code again and again, every X ' +
        'milliseconds, forever, until something explicitly stops it. `setInterval(() => console.log(\'tick\'), ' +
        '1000)` prints "tick" every second, endlessly. This stopwatch uses `setInterval` (not `setTimeout`) ' +
        'because it needs to keep updating the displayed time repeatedly while running, not just once.',
    },
    {
      question: 'What is clearInterval, and why is it needed?',
      answer:
        '`setInterval(...)` gives back an ID number that identifies that specific running timer. ' +
        '`clearInterval(id)` uses that ID to stop it. If you never call `clearInterval`, the interval keeps ' +
        'firing forever — even after the component using it is gone from the screen — which wastes work and, ' +
        'in this stopwatch, would mean a "ghost" timer still trying to update state that nothing is showing ' +
        'anymore.',
    },
    {
      question: 'What is useEffect "cleanup", and why does this stopwatch use it?',
      answer:
        'When you write `useEffect(() => { ...setup...; return () => { ...cleanup... } }, [])`, the function ' +
        'you `return` is the cleanup — React calls it automatically right before the component is removed from ' +
        'the screen (or before the effect re-runs, if its dependencies changed). This stopwatch\'s cleanup ' +
        'calls `clearInterval` there, which guarantees the running timer actually gets stopped whenever the ' +
        'component disappears — you don\'t have to remember to do it manually everywhere the component might ' +
        'go away.',
    },
    {
      question: 'What is Date.now()?',
      answer:
        'A built-in JavaScript function that returns the current time as a plain number — milliseconds since ' +
        'January 1, 1970. On its own that number isn\'t very meaningful, but subtracting two readings of it ' +
        'tells you exactly how much real time passed between them: `Date.now() - startTime` is "how many ' +
        'milliseconds have elapsed since I recorded startTime".',
    },
    {
      question: 'What does "asynchronous" mean, and how do timers relate to it?',
      answer:
        '"Asynchronous" means something is scheduled to happen later, without freezing the rest of the program ' +
        'while it waits. Calling `setInterval(fn, 50)` doesn\'t pause your code for 50ms — it just tells the ' +
        'browser "call this function every 50ms from now on" and immediately moves on to the next line. The ' +
        'browser then calls `fn` on its own schedule, in the background, independent of whatever else your ' +
        'code is doing.',
    },
  ],
}

export default content
