import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TaskLayout from './pages/TaskLayout'
import { tasks } from './tasks/registry'

const taskModules = import.meta.glob<{ default: React.ComponentType }>(
  './tasks/*/index.tsx',
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {tasks.map((task) => {
          const Component = lazy(
            taskModules[`./tasks/${task.slug}/index.tsx`],
          )
          return (
            <Route
              key={task.slug}
              path={`/tasks/${task.slug}`}
              element={
                <TaskLayout task={task}>
                  <Suspense fallback={<p>Loading…</p>}>
                    <Component />
                  </Suspense>
                </TaskLayout>
              }
            />
          )
        })}
      </Routes>
    </BrowserRouter>
  )
}

export default App
