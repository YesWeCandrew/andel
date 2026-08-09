import { useState } from 'react'
import { Check } from 'iconoir-react'
import { todoLogApi } from '../../api/todos'
import type { Todo, TodoLog } from '../../api/todos'
import type { TodoStatus } from './todoHelpers'
import { formatLastLabel, formatNextLabel, formatRelativeToNow, formatTargetLabel } from './todoHelpers'
import styles from './TodoItem.module.css'

interface TodoItemProps {
  todo: Todo
  status: TodoStatus
  lastCompletedOn: string | null
  /** True while a complete request for this todo is in flight. */
  completing?: boolean
  onComplete: (id: number) => void
  onEdit: (todo: Todo) => void
}

export function TodoItem({ todo, status, lastCompletedOn, completing = false, onComplete, onEdit }: TodoItemProps) {
  const isRecurring = Boolean(todo.frequency_days)
  const dueTagClassName = [
    'tag',
    status === 'overdue' && 'tag-danger',
    status === 'due-today' && 'tag-accent',
  ]
    .filter(Boolean)
    .join(' ')

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLogs, setHistoryLogs] = useState<TodoLog[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  async function handleToggleHistory(event: React.MouseEvent) {
    event.stopPropagation()
    if (historyOpen) {
      setHistoryOpen(false)
      return
    }
    setHistoryOpen(true)
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const logs = await todoLogApi.listForTodo(todo.id)
      setHistoryLogs(logs)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={`${styles.tile} ${completing ? styles.tileDone : ''}`}
        disabled={completing || !todo.active}
        onClick={() => onComplete(todo.id)}
        aria-label={`Mark "${todo.title}" as done`}
        title={todo.active ? 'Mark as done' : 'Already completed'}
      >
        {completing ? <Check width={22} height={22} strokeWidth={2} /> : todo.emoji || '✓'}
      </button>

      <button type="button" className={styles.body} onClick={() => onEdit(todo)}>
        <span className={`${styles.title} ${completing ? styles.titleDone : ''}`}>{todo.title}</span>
        <span className={styles.tags}>
          <span className={dueTagClassName}>Due: {formatNextLabel(todo)}</span>
          <span className={`tag ${styles.historyTag}`} onClick={handleToggleHistory}>
            Last: {formatLastLabel(lastCompletedOn)}
          </span>
          {isRecurring && <span className="tag">Target: {formatTargetLabel(todo)}</span>}
        </span>

        {historyOpen && (
          <div className={styles.history} onClick={(event) => event.stopPropagation()}>
            {historyLoading ? (
              <p className={styles.historyEmpty}>Loading…</p>
            ) : historyError ? (
              <p className={styles.historyEmpty}>{historyError}</p>
            ) : !historyLogs || historyLogs.length === 0 ? (
              <p className={styles.historyEmpty}>No completions yet.</p>
            ) : (
              <ul className={styles.historyList}>
                {historyLogs.map((log) => (
                  <li key={log.id}>{formatRelativeToNow(log.completed_on)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </button>
    </li>
  )
}
