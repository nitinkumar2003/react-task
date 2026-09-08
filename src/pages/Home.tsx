import { Link } from 'react-router-dom'
import { categories, tasks } from '../tasks/registry'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>React Machine Coding Practice</h1>
        <p className={styles.subtitle}>
          {tasks.length} interview-style build prompts, grouped by topic.
          Pick one and implement it in its own folder.
        </p>
      </header>

      {categories.map((category) => (
        <section key={category} className={styles.section}>
          <h2 className={styles.categoryTitle}>{category}</h2>
          <ul className={styles.list}>
            {tasks
              .filter((task) => task.category === category)
              .map((task) => (
                <li key={task.slug} className={styles.item}>
                  <Link to={`/tasks/${task.slug}`} className={styles.link}>
                    {task.title}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
