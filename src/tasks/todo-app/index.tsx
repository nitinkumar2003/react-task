import { useCallback, useMemo, useState, type FormEvent } from 'react'
import TodoItem, { type Todo } from './TodoItem'
import { useLocalStorage } from './useLocalStorage'
import styles from './index.module.css'

type Filter = 'all' | 'active' | 'completed'

const FILTERS: Filter[] = ['all', 'active', 'completed']

let idCounter = 0
const createId = () => `${Date.now()}-${idCounter++}`

export default function TodoApp() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('todo-app:todos', [])
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [draft, setDraft] = useState('')

  // Functional updates (no `todos`/`selectedIds` in deps) keep these
  // callbacks referentially stable across renders, so memoized <TodoItem>
  // rows only re-render when their own props actually change.
  const addTodo = useCallback(
    (rawText: string) => {
      const text = rawText.trim()
      if (!text) return
      setTodos((prev) => [...prev, { id: createId(), text, completed: false }])
    },
    [setTodos],
  )

  const toggleComplete = useCallback(
    (id: string) => {
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        ),
      )
    },
    [setTodos],
  )

  const deleteTodo = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [setTodos],
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter((todo) => !todo.completed)
    if (filter === 'completed') return todos.filter((todo) => todo.completed)
    return todos
  }, [todos, filter])

  const visibleIds = useMemo(
    () => filteredTodos.map((todo) => todo.id),
    [filteredTodos],
  )

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))
      const next = new Set(prev)
      for (const id of visibleIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [visibleIds])

  const bulkComplete = useCallback(() => {
    setTodos((prev) =>
      prev.map((todo) =>
        selectedIds.has(todo.id) ? { ...todo, completed: true } : todo,
      ),
    )
  }, [selectedIds, setTodos])

  const bulkDelete = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !selectedIds.has(todo.id)))
    setSelectedIds(new Set())
  }, [selectedIds, setTodos])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.completed))
  }, [setTodos])

  const activeCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  )

  // @@ fix: "Clear completed" used to sit there enabled even with zero
  // completed todos — looked clickable, did nothing, mildly annoying
  const hasCompleted = useMemo(
    () => todos.some((todo) => todo.completed),
    [todos],
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    addTodo(draft)
    setDraft('')
  }

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What needs to be done?"
          className={styles.input}
          aria-label="New todo"
        />
        <button type="submit" className={styles.addButton}>
          Add
        </button>
      </form>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f ? styles.filterButtonActive : styles.filterButton
            }
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className={styles.count}>
          {activeCount} item{activeCount === 1 ? '' : 's'} left
        </span>
      </div>

      {filteredTodos.length > 0 && (
        <div className={styles.bulkBar}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
            />
            Select all
          </label>

          {selectedIds.size > 0 && (
            <>
              <span className={styles.selectedCount}>
                {selectedIds.size} selected
              </span>
              <button type="button" onClick={bulkComplete}>
                Complete
              </button>
              <button type="button" onClick={bulkDelete}>
                Delete
              </button>
              <button type="button" onClick={clearSelection}>
                Clear selection
              </button>
            </>
          )}

          <button
            type="button"
            onClick={clearCompleted}
            disabled={!hasCompleted}
            className={styles.clearCompleted}
          >
            Clear completed
          </button>
        </div>
      )}

      <ul className={styles.list}>
        {filteredTodos.length === 0 ? (
          <li className={styles.empty}>
            {todos.length === 0
              ? 'No todos yet — add one above.'
              : `No ${filter} todos.`}
          </li>
        ) : (
          filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              selected={selectedIds.has(todo.id)}
              onToggleComplete={toggleComplete}
              onToggleSelect={toggleSelect}
              onDelete={deleteTodo}
            />
          ))
        )}
      </ul>
    </div>
  )
}
