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
    {
      question:
        'Why can\'t you just do `setElapsed(prev => prev + 50)` inside setInterval(fn, 50)? It sounds correct.',
      answer:
        'It assumes the browser calls your callback at *exactly* 50ms intervals, which it doesn\'t guarantee — ' +
        'it guarantees "no sooner than 50ms". Under load, or when the tab is backgrounded (browsers throttle ' +
        'timers in inactive tabs, sometimes to once per second), ticks fire late. If you add a fixed 50 every ' +
        'time regardless of how much real time actually passed, every late tick leaves the displayed time ' +
        'permanently behind reality, and the error compounds tick after tick — after a few minutes you could ' +
        'be seconds off. Recomputing from `Date.now()` every tick means a late tick just produces one bigger, ' +
        'still-accurate jump instead of baking in permanent error.',
    },
    {
      question:
        'Why use useRef for startTime/accumulated instead of useState?',
      answer:
        'Because changing them should never, by itself, cause a re-render — only the interval\'s own periodic ' +
        '`setElapsed` call should update the screen. If `startTime`/`accumulated` were state, every start/' +
        'pause/resume would trigger an extra render carrying no new *displayed* information (the display value ' +
        'is `elapsed`, not these bookkeeping numbers). More subtly: refs update synchronously and are readable ' +
        'immediately inside the same function (e.g. `pause()` reads `startTimeRef.current` right after a prior ' +
        'assignment in the same tick), whereas state updates are asynchronous/batched — using state here would ' +
        'risk reading a stale value inside the same event handler.',
    },
    {
      question:
        'What would go wrong if the useEffect cleanup (clearInterval on unmount) were missing?',
      answer:
        'If the user navigates away (or the component is conditionally unmounted, e.g. switching tabs in this ' +
        'very app) while the stopwatch is running, the interval keeps firing against a component instance that ' +
        'no longer exists. Each tick calls setElapsed on unmounted state — pure wasted CPU work at best; in ' +
        'stricter setups (or older React versions) it also logs a "state update on an unmounted component" ' +
        'warning. It\'s also a genuine (if small) memory leak: the interval, and everything its closure holds ' +
        'onto, is kept alive by the timer system indefinitely.',
    },
    {
      question:
        'Why does `pause()` add `Date.now() - startTimeRef.current` into `accumulatedRef` instead of just leaving `elapsed` as the paused total?',
      answer:
        '`elapsed` (state) is a *display* value the last tick happened to leave it at — it\'s not guaranteed to ' +
        'be perfectly in sync with the exact moment pause() runs, since pause() can execute between ticks. ' +
        '`accumulatedRef` is deliberately recomputed from the authoritative source (now minus this run\'s ' +
        'startTime) at the exact instant of pausing, then `elapsed` is set to match it. This guarantees the ' +
        'banked total is always exact, never off by up to one tick interval (50ms here) the way trusting the ' +
        'last-rendered `elapsed` value would be.',
    },
    {
      question:
        'The Lap button is disabled both before starting and while paused. Why not just let it record whatever `elapsed` currently is in either state?',
      answer:
        'A lap only means something relative to a run in progress — recording a lap at 0 before starting is ' +
        'meaningless, and recording one while paused would just duplicate whatever the most recent lap (or the ' +
        'paused total) already shows, since the number isn\'t moving. Disabling it is the same "communicate the ' +
        'boundary through the UI, don\'t let the user discover a no-op by trial and error" principle as ' +
        'disabling +/- at the Counter\'s min/max.',
    },
    {
      question:
        'What was the actual test-writing gotcha here, and why does it matter beyond this one component?',
      answer:
        'The first version of the test suite used `vi.useFakeTimers()` with no arguments, and every single test ' +
        'timed out — not because the component was broken, but because React 18\'s internal scheduler leans on ' +
        'browser timing primitives (MessageChannel, requestAnimationFrame) to flush state updates, and the ' +
        'blanket fake-timers call fakes those too, starving React of the ability to process anything, including ' +
        'the initial click. The fix was to fake only the specific APIs under test (`Date`, `setInterval`/' +
        '`clearInterval`) via `toFake: [...]`. This generalizes to any test involving both `userEvent` clicks ' +
        'AND fake timers in React 18+ — it\'s one of the first things to check when such a test mysteriously ' +
        'hangs instead of failing with a clear assertion error.',
    },
  ],
}

export default content
