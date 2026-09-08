import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Task } from '../tasks/registry'
import styles from './TaskLayout.module.css'

interface TaskLayoutProps {
  task: Task
  children: ReactNode
}

export default function TaskLayout({ task, children }: TaskLayoutProps) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>
          ← All tasks
        </Link>
        <span className={styles.category}>{task.category}</span>
        <h1 className={styles.title}>{task.title}</h1>
        <p className={styles.description}>{task.description}</p>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
