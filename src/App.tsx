import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TaskLayout from './pages/TaskLayout'
import { tasks } from './tasks/registry'
import { emptyLearning, type LearningContent } from './tasks/learning-types'

const taskModules = import.meta.glob<{ default: React.ComponentType }>(
  './tasks/*/index.tsx',
)

// learning.ts files are tiny data objects (no JSX), so load them eagerly —
// no need to code-split/Suspense just for a summary + a list of strings.
const learningModules = import.meta.glob<{ default: LearningContent }>(
  './tasks/*/learning.ts',
  { eager: true },
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {tasks.map((task) => {
          const TaskComponent = lazy(
            taskModules[`./tasks/${task.slug}/index.tsx`],
          )
          const learning =
            learningModules[`./tasks/${task.slug}/learning.ts`]?.default ??
            emptyLearning(task.title)

          return (
            <Route
              key={task.slug}
              path={`/tasks/${task.slug}`}
              element={
                <TaskLayout
                  task={task}
                  TaskComponent={TaskComponent}
                  learning={learning}
                />
              }
            />
          )
        })}
      </Routes>
    </BrowserRouter>
  )
}

export default App
