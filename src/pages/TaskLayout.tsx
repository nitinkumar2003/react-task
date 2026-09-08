import { Suspense, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import LearningPanel from '../components/LearningPanel'
import type { LearningContent } from '../tasks/learning-types'
import type { Task } from '../tasks/registry'
import styles from './TaskLayout.module.css'

type Tab = 'task' | 'learning'

interface TaskLayoutProps {
  task: Task
  TaskComponent: ComponentType
  learning: LearningContent
}

export default function TaskLayout({
  task,
  TaskComponent,
  learning,
}: TaskLayoutProps) {
  const [tab, setTab] = useState<Tab>('task')

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

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'task'}
          onClick={() => setTab('task')}
          className={tab === 'task' ? styles.tabActive : styles.tab}
        >
          Task
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'learning'}
          onClick={() => setTab('learning')}
          className={tab === 'learning' ? styles.tabActive : styles.tab}
        >
          Learning
        </button>
      </div>

      <main className={styles.content}>
        {tab === 'task' ? (
          <Suspense fallback={<p>Loading…</p>}>
            <TaskComponent />
          </Suspense>
        ) : (
          <LearningPanel content={learning} />
        )}
      </main>
    </div>
  )
}
