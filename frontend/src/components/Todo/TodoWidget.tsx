import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, CheckCircleSolid, Collapse, Plus } from 'iconoir-react'
import { useTodos } from '../../hooks/useTodos'
import { TodoItem } from './TodoItem'
import { TodoForm } from './TodoForm'
import { usePageTitle } from '../../hooks/usePageTitle'
import { getLastCompletedMap, getTodoStatus } from './todoHelpers'
import type { UpsertTodoInput } from '../../api/todos'
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

export function TodoWidget({ variant = 'full', onExpand, maxTileItems = 3 }: TodoWidgetProps) {
  const { todos, logs, loading, error, create, update, complete, remove } = useTodos()
  const navigate = useNavigate()
  const location = useLocation()
  const { id: idParam } = useParams<{ id?: string }>()

  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)

  const isTile = variant === 'tile'
  usePageTitle(isTile ? undefined : 'To do')

  // Route-derived form state: /todo/new opens the create form, /todo/:id
  // opens that todo for editing (full variant only). On the dashboard tile,
  // "New" instead opens the same form in place via history state, so the
  // URL stays on "/" but the browser back button still closes it.
  const tileNewFormOpen = isTile && Boolean((location.state as { newTodo?: boolean } | null)?.newTodo)
  // Wait for todos to finish loading before opening an existing-item edit —
  // otherwise the form mounts against an empty list, resolves no match, and
  // renders as a blank "new" form that never recovers once the data arrives.
  const fullFormOpen = !isTile && idParam !== undefined && (idParam === 'new' || !loading)
  const formOpen = fullFormOpen || tileNewFormOpen
  const editingTodo = idParam && idParam !== 'new' ? (todos.find((t) => String(t.id) === idParam) ?? null) : null

  // If a linked/bookmarked id doesn't match a real todo once loading finishes, bounce back to the list.
  useEffect(() => {
    if (!isTile && idParam && idParam !== 'new' && !loading && !editingTodo) {
      navigate('/todo', { replace: true })
    }
  }, [isTile, idParam, loading, editingTodo, navigate])

  const lastCompletedMap = useMemo(() => getLastCompletedMap(logs), [logs])
  const activeTodos = useMemo(() => todos.filter((t) => t.active), [todos])
  const completedTodos = useMemo(() => todos.filter((t) => !t.active), [todos])
  const baseTodos = showCompleted ? completedTodos : activeTodos
  const visibleTodos = isTile ? baseTodos.slice(0, maxTileItems) : baseTodos

  const dueCount = useMemo(
    () =>
      activeTodos.filter((t) => {
        const status = getTodoStatus(t)
        return status === 'overdue' || status === 'due-today'
      }).length,
    [activeTodos],
  )

  function openCreateForm() {
    setFormError(null)
    if (isTile) {
      navigate(location.pathname, { state: { newTodo: true } })
    } else {
      navigate('/todo/new')
    }
  }

  function openEditForm(todo: { id: number }) {
    setFormError(null)
    navigate(`/todo/${todo.id}`)
  }

  function closeForm() {
    setFormError(null)
    if (tileNewFormOpen) {
      // Pop the history entry openCreateForm pushed, rather than pushing yet
      // another one, so the browser back button doesn't have to step over it.
      navigate(-1)
    } else {
      navigate('/todo', { replace: true })
    }
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
        await update(editingTodo.id, input)
      } else {
        await create(input)
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
        <CheckCircle className={styles.headerIcon} width={32} height={32} strokeWidth={1.7} />
        <h1 className={styles.title}>To do</h1>
        <span className={styles.count}>{dueCount} due</span>
        <button
          type="button"
          className={`button button-secondary ${styles.newButton}`}
          onClick={(event) => {
            event.stopPropagation()
            setShowCompleted((prev) => !prev)
          }}
        >
          {showCompleted ? (
            <CheckCircle width={14} height={14} strokeWidth={2.2} />
          ) : (
            <CheckCircleSolid width={14} height={14} strokeWidth={2.2} />
          )}
          {showCompleted ? 'Show active' : 'Show completed'}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={(event) => {
            event.stopPropagation()
            openCreateForm()
          }}
        >
          <Plus width={14} height={14} strokeWidth={2.2} />
          New
        </button>
        {!isTile && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/')}
            aria-label="Back to dashboard"
            title="Collapse"
          >
            <Collapse width={14} height={14} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : visibleTodos.length === 0 ? (
        <p className={styles.empty}>
          {showCompleted ? 'No completed to-dos yet.' : 'Nothing due — enjoy the free time.'}
        </p>
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

      {isTile && baseTodos.length > maxTileItems && (
        <button type="button" className={styles.seeAll} onClick={onExpand}>
          See {baseTodos.length - maxTileItems} more to-dos
        </button>
      )}

      {formOpen && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
            <TodoForm
              key={idParam}
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
