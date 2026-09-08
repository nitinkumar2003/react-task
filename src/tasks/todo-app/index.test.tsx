import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import TodoApp from './index'

const STORAGE_KEY = 'todo-app:todos'

async function addTodo(text: string) {
  const user = userEvent.setup()
  const input = screen.getByLabelText('New todo')
  await user.type(input, text)
  await user.click(screen.getByRole('button', { name: 'Add' }))
  return user
}

function getRow(text: string) {
  return screen.getByText(text).closest('li')!
}

beforeEach(() => {
  localStorage.clear()
})

describe('TodoApp — adding todos', () => {
  it('adds a todo and clears the input (positive)', async () => {
    render(<TodoApp />)
    await addTodo('Buy milk')

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByLabelText('New todo')).toHaveValue('')
    expect(screen.getByText('1 item left')).toBeInTheDocument()
  })

  it('does not add an empty todo (negative)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('No todos yet — add one above.')).toBeInTheDocument()
  })

  it('does not add a whitespace-only todo (negative)', async () => {
    render(<TodoApp />)
    await addTodo('    ')

    expect(screen.getByText('No todos yet — add one above.')).toBeInTheDocument()
  })
})

describe('TodoApp — completing todos', () => {
  it('marks a todo complete and updates the active count (positive)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Buy milk')

    const row = getRow('Buy milk')
    await user.click(within(row).getByRole('checkbox', { name: /mark/i }))

    expect(screen.getByText('0 items left')).toBeInTheDocument()
  })

  it('toggling twice returns the todo to active (edge case)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Buy milk')

    const row = getRow('Buy milk')
    const doneToggle = within(row).getByRole('checkbox', { name: /mark/i })
    await user.click(doneToggle)
    await user.click(doneToggle)

    expect(screen.getByText('1 item left')).toBeInTheDocument()
  })
})

describe('TodoApp — deleting todos', () => {
  it('removes the todo from the list (positive)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Buy milk')

    const row = getRow('Buy milk')
    await user.click(within(row).getByRole('button', { name: /delete/i }))

    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
  })

  it('deleting a SELECTED todo also drops it out of the selection count (negative / regression)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Buy milk')
    await addTodo('Walk dog')

    // select both
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    // delete one of the two selected todos directly (not via bulk delete)
    const row = getRow('Buy milk')
    await user.click(within(row).getByRole('button', { name: /delete/i }))

    // the deleted item must not linger in the selection count
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()
  })

  it('deleting the last todo shows the empty state (edge case)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Only one')

    const row = getRow('Only one')
    await user.click(within(row).getByRole('button', { name: /delete/i }))

    expect(screen.getByText('No todos yet — add one above.')).toBeInTheDocument()
  })
})

describe('TodoApp — filters', () => {
  it('active filter hides completed todos, completed filter hides active ones (positive)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Active task')
    await addTodo('Done task')

    const doneRow = getRow('Done task')
    await user.click(within(doneRow).getByRole('checkbox', { name: /mark/i }))

    await user.click(screen.getByRole('button', { name: 'Active' }))
    expect(screen.getByText('Active task')).toBeInTheDocument()
    expect(screen.queryByText('Done task')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.getByText('Done task')).toBeInTheDocument()
    expect(screen.queryByText('Active task')).not.toBeInTheDocument()
  })

  it('shows a filter-specific empty state when nothing matches (negative)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Active task')

    await user.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.getByText('No completed todos.')).toBeInTheDocument()
  })
})

describe('TodoApp — bulk actions', () => {
  it('select all only selects todos visible under the current filter (positive)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Active task')
    await addTodo('Done task')

    const doneRow = getRow('Done task')
    await user.click(within(doneRow).getByRole('checkbox', { name: /mark/i }))

    await user.click(screen.getByRole('button', { name: 'Active' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('bulk complete marks every selected todo done (positive)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Task A')
    await addTodo('Task B')

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    await user.click(screen.getByRole('button', { name: 'Complete' }))

    expect(screen.getByText('0 items left')).toBeInTheDocument()
  })

  it('bulk delete removes every selected todo and resets selection (positive)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Task A')
    await addTodo('Task B')
    await addTodo('Task C')

    await user.click(getRow('Task A').querySelector('input[type=checkbox]')!)
    await user.click(getRow('Task B').querySelector('input[type=checkbox]')!)
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByText('Task A')).not.toBeInTheDocument()
    expect(screen.queryByText('Task B')).not.toBeInTheDocument()
    expect(screen.getByText('Task C')).toBeInTheDocument()
    // bulk bar's selected-count controls must disappear once selection is empty
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
  })

  it('"Clear completed" is disabled when nothing is completed (negative)', async () => {
    render(<TodoApp />)
    await addTodo('Task A')

    expect(screen.getByRole('button', { name: 'Clear completed' })).toBeDisabled()
  })

  it('"Clear completed" only removes completed todos, selection of a survivor stays intact (edge case)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Keep me')
    await addTodo('Clear me')

    const clearMeRow = getRow('Clear me')
    await user.click(within(clearMeRow).getByRole('checkbox', { name: /mark/i }))

    // also select the survivor before clearing completed
    await user.click(getRow('Keep me').querySelector('input[type=checkbox]')!)
    await user.click(screen.getByRole('button', { name: 'Clear completed' }))

    expect(screen.queryByText('Clear me')).not.toBeInTheDocument()
    expect(screen.getByText('Keep me')).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })
})

describe('TodoApp — select-all checkbox stays accurate', () => {
  it('stays checked after deleting one of several selected todos, since the rest are still all selected (edge case)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Task A')
    await addTodo('Task B')

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))
    const row = getRow('Task A')
    await user.click(within(row).getByRole('button', { name: /delete/i }))

    expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeChecked()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('unchecks after bulk-deleting the only selected todos, leaving an unselected survivor (edge case)', async () => {
    render(<TodoApp />)
    const user = userEvent.setup()
    await addTodo('Selected')
    await addTodo('Untouched')

    await user.click(getRow('Selected').querySelector('input[type=checkbox]')!)
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByRole('checkbox', { name: 'Select all' })).not.toBeChecked()
    expect(screen.getByText('Untouched')).toBeInTheDocument()
  })
})

describe('TodoApp — persistence', () => {
  it('writes todos to localStorage (positive)', async () => {
    render(<TodoApp />)
    await addTodo('Persisted task')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ text: 'Persisted task', completed: false })
  })

  it('loads existing todos from localStorage on mount (positive)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: '1', text: 'From storage', completed: false }]),
    )

    render(<TodoApp />)

    expect(screen.getByText('From storage')).toBeInTheDocument()
  })

  it('falls back to an empty list when localStorage holds invalid JSON (negative)', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')

    render(<TodoApp />)

    expect(screen.getByText('No todos yet — add one above.')).toBeInTheDocument()
  })
})
