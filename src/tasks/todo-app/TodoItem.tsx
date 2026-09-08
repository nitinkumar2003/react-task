import { memo } from 'react'
import styles from './TodoItem.module.css'

export interface Todo {
  id: string
  text: string
  completed: boolean
}

interface TodoItemProps {
  todo: Todo
  selected: boolean
  onToggleComplete: (id: string) => void
  onToggleSelect: (id: string) => void
  onDelete: (id: string) => void
}

function TodoItem({
  todo,
  selected,
  onToggleComplete,
  onToggleSelect,
  onDelete,
}: TodoItemProps) {
  return (
    <li className={styles.item}>
      {/* @@ this is only for bulk select — kept it small, square, grey so it doesn't
          get confused with the "mark complete" control below */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(todo.id)}
        aria-label={`Select "${todo.text}"`}
        title="Select for bulk actions"
        className={styles.selectBox}
      />
      {/* @@ fix: this used to be a second plain checkbox sitting right next to the
          select one — same shape, same size, zero difference, so nobody could tell
          which checkbox did what (that's the bug from the screenshot). swapped it
          for a round toggle button that fills purple + shows a tick when done, so
          "select" and "complete" actually look like two different things now */}
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'active' : 'complete'}`}
        title="Mark complete"
        onClick={() => onToggleComplete(todo.id)}
        className={todo.completed ? styles.doneToggleChecked : styles.doneToggle}
      >
        {todo.completed && '✓'}
      </button>
      <span className={todo.completed ? styles.completed : styles.text}>
        {todo.text}
      </span>
      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        aria-label={`Delete "${todo.text}"`}
        className={styles.deleteButton}
      >
        ✕
      </button>
    </li>
  )
}

export default memo(TodoItem)
