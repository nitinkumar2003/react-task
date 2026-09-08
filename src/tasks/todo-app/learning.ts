import type { LearningContent } from '../learning-types'

const content: LearningContent = {
  summary:
    'CRUD list with client-side filtering, multi-select bulk actions, and localStorage persistence. ' +
    'File split: index.tsx owns all state + logic, TodoItem.tsx is a memoized presentational row, ' +
    'useLocalStorage.ts is a generic persistence hook. The one decision that shapes everything else: ' +
    'every mutator is a useCallback built on the *functional* form of setState, so it never needs ' +
    'the current `todos`/`selectedIds` in its dependency array. That keeps its identity stable across ' +
    'renders — which is the only reason wrapping <TodoItem> in React.memo actually saves any renders.',

  concepts: [
    'useState',
    'useCallback',
    'useMemo',
    'React.memo',
    'custom hook (useLocalStorage)',
    'functional setState updates',
    'controlled inputs',
    'Set for O(1) selection lookups',
    'TypeScript generics',
    'code-splitting via React.lazy',
  ],

  codeSnippets: [
    {
      title: '1. Persistence — a generic useLocalStorage hook',
      code: `export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable (private mode / quota exceeded) — ignore
    }
  }, [key, value])

  return [value, setValue]
}

// usage — drop-in replacement for useState:
const [todos, setTodos] = useLocalStorage<Todo[]>('todo-app:todos', [])`,
      explanation:
        'The lazy initializer (`useState(() => ...)`) runs only once, on mount — reading ' +
        'localStorage on every render would be wasteful and pointless since nothing external ' +
        'changes it during the component\'s life. The effect re-runs whenever `value` changes and ' +
        'writes it back out, so every setTodos() call transparently persists. Wrapping both read ' +
        'and write in try/catch matters in real apps: Safari private mode and quota-exceeded both ' +
        'throw on localStorage access, and a persistence hook should degrade to "just don\'t persist", ' +
        'not crash the app.',
    },
    {
      title: '2. Stable callbacks — functional setState instead of reading state',
      code: `// BAD — depends on \`todos\`, so a new function is created every time todos changes,
// which defeats React.memo on every <TodoItem> below it:
const toggleComplete = useCallback((id: string) => {
  setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
}, [todos])

// GOOD — the updater function receives the latest state as its argument,
// so the callback itself never needs to read (or depend on) \`todos\`:
const toggleComplete = useCallback((id: string) => {
  setTodos((prev) =>
    prev.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  )
}, [setTodos])`,
      explanation:
        'This is the single most important pattern in the whole component. useCallback only ' +
        'gives you a stable function reference if its dependency array is stable too — and ' +
        '`setTodos` from useState (or this custom hook) is guaranteed stable by React, forever. ' +
        'So `toggleComplete` is created exactly once and never changes identity for the ' +
        'lifetime of the component. Every other mutator (addTodo, deleteTodo, toggleSelect, ' +
        'clearCompleted) follows the same shape.',
    },
    {
      title: '3. Why React.memo on <TodoItem> actually works here',
      code: `// TodoItem.tsx
function TodoItem({ todo, selected, onToggleComplete, ... }: TodoItemProps) {
  return <li>...</li>
}
export default memo(TodoItem)

// index.tsx — rendering the list
{filteredTodos.map((todo) => (
  <TodoItem
    key={todo.id}
    todo={todo}
    selected={selectedIds.has(todo.id)}
    onToggleComplete={toggleComplete}   // same function reference every render
    onToggleSelect={toggleSelect}       // same function reference every render
    onDelete={deleteTodo}               // same function reference every render
  />
))}`,
      explanation:
        'React.memo does a shallow prop comparison and skips re-rendering if every prop is ' +
        '===-equal to last time. Toggling one todo calls setTodos(prev => prev.map(...)) — ' +
        'that creates a *new array* and a *new object* for the one todo that changed, but every ' +
        'other element in the array keeps its old object reference (map only replaces the item ' +
        'that matched). So out of 100 rows, 99 receive the exact same `todo` object as last render, ' +
        'and their `onToggleComplete`/`onToggleSelect`/`onDelete` props are stable per point 2 above — ' +
        'meaning React.memo bails out and skips 99 re-renders. If those callbacks were recreated ' +
        'every render (the BAD version above), memo would be pointless: props would differ every ' +
        'time regardless of what actually changed.',
    },
    {
      title: '4. Set-based multi-select for bulk actions',
      code: `const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

const toggleSelect = useCallback((id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev)      // copy — never mutate state in place
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}, [])

// bulk action reads the set to filter todos:
const bulkDelete = useCallback(() => {
  setTodos((prev) => prev.filter((todo) => !selectedIds.has(todo.id)))
  setSelectedIds(new Set())
}, [selectedIds, setTodos])`,
      explanation:
        '`selectedIds.has(id)` is O(1); the equivalent with an array of ids (`ids.includes(id)`) ' +
        'is O(n) — and it gets checked once per row, every render, so an array turns selection ' +
        'checking into an accidental O(n²) over the whole list. The copy-then-mutate-the-copy ' +
        'pattern (`new Set(prev)`) is the Set/Map equivalent of array spread (`[...prev]`) — ' +
        'React needs a new reference to detect the state change, so mutating `prev` directly ' +
        '(`prev.add(id); return prev`) would silently fail to trigger a re-render. Notice ' +
        '`bulkDelete` genuinely needs `selectedIds` in its dependency array (unlike the point-2 ' +
        'callbacks) — it reads the value directly rather than going through a setState updater, ' +
        'because it\'s deriving from *two* pieces of state (todos and selectedIds) at once.',
    },
    {
      title: '5. Derived state with useMemo — filtering without re-filtering on every keystroke',
      code: `const filteredTodos = useMemo(() => {
  if (filter === 'active') return todos.filter((todo) => !todo.completed)
  if (filter === 'completed') return todos.filter((todo) => todo.completed)
  return todos
}, [todos, filter])

const activeCount = useMemo(
  () => todos.filter((todo) => !todo.completed).length,
  [todos],
)`,
      explanation:
        'Both are pure computations from existing state — nothing here is "real" state, so ' +
        'neither is stored with useState (storing it would just create a second source of truth ' +
        'you\'d have to remember to keep in sync). useMemo only recomputes when `todos` or ' +
        '`filter` actually change — typing in the "new todo" input, for instance, updates `draft` ' +
        'state and re-renders TodoApp, but filteredTodos/activeCount skip recomputation because ' +
        'their dependencies didn\'t change. For a list this small the win is negligible; the habit ' +
        'is what matters once the list (or the filter predicate) gets expensive.',
    },
  ],

  interviewQuestions: [
    {
      question:
        'Why does using the functional form of setState (setTodos(prev => ...)) let you drop `todos` from a useCallback\'s dependency array — and why does that matter for React.memo downstream?',
      answer:
        'The updater function React passes you always receives the freshest state as its argument, ' +
        'regardless of what "todos" was captured as in that render\'s closure. So the callback ' +
        'body never actually reads the outer `todos` variable — it has nothing to depend on. ' +
        'That means useCallback\'s dependency array can be just `[setTodos]`, and since setState ' +
        'setters are guaranteed stable by React forever, the callback itself is created once and ' +
        'never changes identity. That stable identity is exactly what a prop needs to be for ' +
        'React.memo\'s shallow comparison to actually skip a re-render — a callback recreated ' +
        'every render would make memo useless no matter how carefully you write it.',
    },
    {
      question:
        'React.memo does a shallow prop comparison. The `todo` object is recreated on every toggle via `.map()` — why does that NOT cause every row to re-render, only the toggled one?',
      answer:
        '`.map()` builds a new array, but it only builds a *new object* for the element whose ' +
        'callback returned something different — every other element is returned as-is, so it ' +
        'keeps the exact same object reference it had before. React.memo compares each prop with ' +
        '`Object.is`, so for the 99 rows whose todo object reference is unchanged, `todo` compares ' +
        'equal, and combined with stable callback props (see the previous answer) every prop is ' +
        'unchanged — memo bails out for those rows. Only the row whose object was actually replaced ' +
        're-renders.',
    },
    {
      question:
        'Why use a Set for selectedIds instead of an array? What would checking "is this id selected" cost with each data structure, both per-check and across the whole render?',
      answer:
        'Set.has(id) is O(1) average case (hash lookup). Array.includes(id) is O(n) — it walks the ' +
        'array. That check runs once per visible row, every render (selected={selectedIds.has(todo.id)}), ' +
        'so with an array you\'d be doing n lookups of O(n) each — O(n²) total per render just to ' +
        'figure out who\'s selected, which gets noticeably slow well before 10,000 rows. A Set keeps ' +
        'that at O(n) total.',
    },
    {
      question:
        'What\'s the actual difference between useMemo and useCallback under the hood — and when would using one instead of the other be simply wrong, not just a style choice?',
      answer:
        'useCallback(fn, deps) is literally useMemo(() => fn, deps) — it memoizes a function value. ' +
        'useMemo memoizes the *result* of calling a function. Using useMemo to "memoize a callback" ' +
        '(useMemo(() => () => doThing(), deps)) works but is just useCallback spelled out the long ' +
        'way — that\'s a style nit, not a bug. The genuinely wrong swap is the other direction: using ' +
        'useCallback where you actually want a computed value, e.g. useCallback(() => expensiveFilter(list), ' +
        '[list]) gives you back a *function*, not the filtered list — you\'d have to call it every ' +
        'render anyway, defeating the memoization entirely. That should have been useMemo(() => ' +
        'expensiveFilter(list), [list]).',
    },
    {
      question:
        '`bulkDelete` has `selectedIds` in its dependency array, but `toggleComplete` doesn\'t need `todos` in its. What\'s the structural difference that explains this?',
      answer:
        '`toggleComplete` only ever needs the *previous todos array* to compute the next one, and ' +
        'the setState updater callback hands that to it directly — so it never reads the outer ' +
        '`todos` closure variable at all. `bulkDelete` is different: it needs to filter todos by ' +
        '"is this id in selectedIds", and `selectedIds` is a *second, independent* piece of state ' +
        'that the setTodos updater has no access to (setState only gives you the previous value of ' +
        'the state you\'re updating, not other state). So `bulkDelete` has to close over the current ' +
        '`selectedIds` from the render — which means it genuinely must be in the dependency array, ' +
        'and the callback\'s identity legitimately changes whenever the selection changes.',
    },
    {
      question:
        'This app persists to localStorage on every state change via useEffect. What happens with rapid updates (e.g. holding down "delete"), and how would you debounce the writes?',
      answer:
        'Each state update runs the effect again, so rapid updates mean rapid, redundant ' +
        'JSON.stringify + localStorage.setItem calls — wasted work, though not usually visible to ' +
        'the user since it\'s synchronous and cheap at small scale. To debounce: keep a ref to a ' +
        'timeout id inside the hook, clear it on every effect run, and schedule the actual write ' +
        '250-500ms out; also add a cleanup that flushes immediately on unmount so the very last ' +
        'state change isn\'t lost if the component unmounts mid-debounce.',
    },
    {
      question:
        'How would you sync todos across two open browser tabs? (hint: the `storage` event fires in *other* tabs, not the one that wrote — or BroadcastChannel)',
      answer:
        'Add a `window.addEventListener(\'storage\', handler)` in the hook — the browser fires this ' +
        'event on every *other* tab/window sharing the same origin whenever localStorage changes ' +
        '(the tab that made the change does not get its own event). The handler checks ' +
        '`event.key === key`, parses `event.newValue`, and calls setValue with it. BroadcastChannel ' +
        'is the more modern alternative — you\'d post a message after every write and every tab ' +
        '(including a shared "channel", not localStorage\'s storage event) listens and updates its ' +
        'own state; it also works for state that isn\'t persisted to localStorage at all.',
    },
    {
      question:
        'This list re-renders the whole `<ul>` on filter change. How would you virtualize it if there were 10,000 todos?',
      answer:
        'Only render the rows currently scrolled into view (plus a small overscan buffer) instead ' +
        'of all 10,000 <li> elements — a library like @tanstack/react-virtual (or react-window) ' +
        'measures the scroll container, computes which indices are visible, and renders just those, ' +
        'positioning them absolutely (or via transform) inside a container sized to the *full* list\'s ' +
        'height so the scrollbar still behaves correctly. The filtering itself (useMemo over `todos`) ' +
        'stays exactly the same — virtualization only changes how the *filtered* array gets rendered ' +
        'to DOM nodes, not how it\'s computed.',
    },
    {
      question:
        'Where would you put optimistic UI + rollback-on-failure if `todos` were backed by a real API instead of localStorage?',
      answer:
        'Update local state immediately (optimistic) inside the mutator — e.g. toggleComplete flips ' +
        'the todo in state right away — then fire the API call. On failure, revert: either re-apply ' +
        'the previous state (keep a snapshot before the optimistic update) or re-toggle the specific ' +
        'field, and surface an error (toast). The tricky part is concurrent optimistic updates on the ' +
        'same item — snapshot-based rollback ("restore exactly what it was before this specific ' +
        'mutation") is safer than a blind re-toggle if multiple actions on the same todo can overlap.',
    },
    {
      question:
        'The mutating-a-copy pattern shows up for both arrays (`[...prev, x]`) and Sets (`new Set(prev)`) here — why does React require a new reference at all instead of just deep-comparing state?',
      answer:
        'Deep-comparing on every setState call would mean walking the entire data structure on every ' +
        'single update just to decide *whether* to re-render — for a large todos array that cost is ' +
        'paid constantly, on every keystroke and every toggle, even when nothing meaningfully changed. ' +
        'A reference check (Object.is) is O(1) regardless of how big the structure is. The tradeoff ' +
        'React makes is: push the cost of "did this change" onto the developer (via the discipline of ' +
        'always producing a new reference on change, never mutating in place) instead of paying an ' +
        'unavoidable O(n) tax on every render.',
    },
  ],
}

export default content
