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
      question: 'What is state in React (useState)?',
      answer:
        'State is a value a component remembers, that can change over time and makes the component ' +
        'redraw itself when it does. `const [todos, setTodos] = useState([])` — `todos` is the current ' +
        'value, `setTodos` is the only correct way to change it. Calling `setTodos(newList)` tells React ' +
        '"re-run this component with the new list" — that\'s what actually updates the screen.',
    },
    {
      question: 'What is useCallback?',
      answer:
        'A Hook that keeps the SAME function reference across re-renders, as long as its dependency ' +
        'array hasn\'t changed. Normally, writing `const toggle = (id) => {...}` inside a component ' +
        'creates a brand-new function every single render. `useCallback(fn, deps)` returns the exact ' +
        'same function object as last time when `deps` are unchanged, instead of a new one. This mostly ' +
        'matters when you pass that function down as a prop to a child wrapped in `React.memo` (see below).',
    },
    {
      question: 'What is useMemo?',
      answer:
        'A Hook that remembers the RESULT of a calculation, and only recalculates it when its ' +
        'dependencies change. `const filteredTodos = useMemo(() => todos.filter(...), [todos, filter])` ' +
        '— instead of re-filtering the list on every single render (even ones unrelated to `todos` or ' +
        '`filter`), it reuses the last result until one of those two actually changes.',
    },
    {
      question: 'What is React.memo, and what does it do?',
      answer:
        'A wrapper you put around a component — `export default memo(TodoItem)` — that tells React ' +
        '"before re-rendering this component again, compare its new props to its old props; if they\'re ' +
        'all the same, skip the re-render entirely." It compares props with a shallow check (`===` on ' +
        'each prop), so it only actually helps if the props you pass in (including any functions) stay ' +
        'the same reference when nothing relevant changed — which is what useCallback above is for.',
    },
    {
      question: 'What is a "controlled input"?',
      answer:
        'An input whose value is driven entirely by React state, not the browser\'s own memory of what ' +
        'was typed. The "new todo" text box here uses `value={draft}` and updates `draft` via ' +
        '`onChange` — the box never has a value of its own, it just always shows whatever `draft` ' +
        'currently is.',
    },
    {
      question: 'What is localStorage?',
      answer:
        'A small key-value storage built into the browser that persists even after the tab or browser ' +
        'is closed (unlike normal JS variables, which reset on every page reload). You can only store ' +
        'strings in it, so objects/arrays need `JSON.stringify` to save and `JSON.parse` to read back — ' +
        'which is exactly what the `useLocalStorage` hook in this task does automatically.',
    },
    {
      question: 'What is a Set in JavaScript, and how is it different from an Array?',
      answer:
        'A `Set` is a collection that only stores unique values and is built to answer "is X in here?" ' +
        'very fast (`set.has(x)`). An `Array` can hold duplicates and checking "is X in here?" ' +
        '(`array.includes(x)`) has to walk through every item one by one. This task uses a `Set` for ' +
        '`selectedIds` (which todos are checked for bulk actions) specifically because that "is this ' +
        'one selected?" check happens for every row, every render.',
    },
    {
      question: 'What does a "functional update" to setState mean — e.g. setTodos(prev => ...)?',
      answer:
        'Instead of `setTodos(someNewValue)`, you pass setTodos a FUNCTION: `setTodos(prev => ...)`. ' +
        'React calls that function for you and hands it the most up-to-date state as `prev`, then uses ' +
        'whatever it returns as the new state. This is safer than reading the `todos` variable directly ' +
        'from inside a handler, especially when multiple updates might happen close together.',
    },
  ],
}

export default content
