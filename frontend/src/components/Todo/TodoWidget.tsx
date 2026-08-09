import { useMemo, useState } from 'react'
import { CheckSquare, Plus } from 'iconoir-react'
import { useTodos } from '../../hooks/useTodos'
import { TodoItem } from './TodoItem'
import { TodoForm } from './TodoForm'
import { getLastCompletedMap, getTodoStatus } from './todoHelpers'
import type { UpsertTodoInput, Todo } from '../../api/todos'
import styles from './TodoWidget.module.css'

interface TodoWidgetProps {
  /**
   * 'full' renders the standalone app view; 'tile' renders a compact,
   * height-limited card meant to sit on the dashboard. Both render the same
   * live data and support completing/editing todos directly.
   */
  variant?: 'tile' | 'full'
  /** Called when a tile-variant widget wants to become the full view. */
  onExpand?: () => void
  /** How many rows to show before offering "see all" in tile mode. */
  maxTileItems?: number
}

export function TodoWidget({ variant = 'full', onExpand, maxTileItems = 4 }: TodoWidgetProps) {
  const { todos, logs, loading, error, create, update, complete, remove } = useTodos()

  const [formOpen, setFormOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())

  const isTile = variant === 'tile'

  const lastCompletedMap = useMemo(() => getLastCompletedMap(logs), [logs])
  const activeTodos = useMemo(() => todos.filter((t) => t.active), [todos])
  const visibleTodos = isTile ? activeTodos.slice(0, maxTileItems) : activeTodos

  const dueCount = useMemo(
    () =>
      activeTodos.filter((t) => {
        const status = getTodoStatus(t)
        return status === 'overdue' || status === 'due-today'
      }).length,
    [activeTodos],
  )

  function openCreateForm() {
    setEditingTodo(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(todo: Todo) {
    setEditingTodo(todo)
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingTodo(null)
    setFormError(null)
  }

  async function handleComplete(id: number) {
    setPendingIds((prev) => new Set(prev).add(id))
    try {
      await complete(id)
    } catch (err) {
      console.error('Failed to complete todo', err)
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleDelete() {
    if (!editingTodo) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await remove([editingTodo.id])
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong, please try again')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleFormSubmit(input: UpsertTodoInput) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (editingTodo) {
        await update(editingTodo.id, input as UpsertTodoInput)
      } else {
        await create(input as UpsertTodoInput)
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong, please try again')
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <div
        className={styles.header}
        onClick={isTile ? onExpand : undefined}
        role={isTile && onExpand ? 'button' : undefined}
        tabIndex={isTile && onExpand ? 0 : undefined}
      >
        <CheckSquare className={styles.headerIcon} width={26} height={26} strokeWidth={1.7} />
        <h1 className={styles.title}>To do</h1>
        <span className={styles.count}>{dueCount} due</span>
        <button
          type="button"
          className={`button button-primary ${styles.newButton}`}
          onClick={(event) => {
            event.stopPropagation()
            openCreateForm()
          }}
        >
          <Plus width={14} height={14} strokeWidth={2.2} />
          New
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : visibleTodos.length === 0 ? (
        <p className={styles.empty}>Nothing due — enjoy the free time.</p>
      ) : (
        <ul className={styles.list}>
          {visibleTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              status={getTodoStatus(todo)}
              lastCompletedOn={lastCompletedMap[todo.id] ?? null}
              completing={pendingIds.has(todo.id)}
              onComplete={handleComplete}
              onEdit={openEditForm}
            />
          ))}
        </ul>
      )}

      {isTile && activeTodos.length > maxTileItems && (
        <button type="button" className={styles.seeAll} onClick={onExpand}>
          See all {activeTodos.length}
        </button>
      )}

      {formOpen && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
            <TodoForm
              initialTodo={editingTodo}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
              onDelete={editingTodo ? handleDelete : undefined}
              submitting={formSubmitting}
              error={formError}
            />
          </div>
        </div>
      )}
    </div>
  )
}
