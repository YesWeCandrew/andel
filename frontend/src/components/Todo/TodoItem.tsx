import { Check } from 'iconoir-react'
import type { Todo } from '../../api/todos'
import type { TodoStatus } from './todoHelpers'
import { formatLastLabel, formatNextLabel, formatTargetLabel } from './todoHelpers'
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
  const nextTagClassName = [
    'tag',
    status === 'overdue' && 'tag-danger',
    status === 'due-today' && 'tag-accent',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={`${styles.tile} ${completing ? styles.tileDone : ''}`}
        disabled={completing}
        onClick={() => onComplete(todo.id)}
        aria-label={`Mark "${todo.title}" as done`}
        title="Mark as done"
      >
        {completing ? <Check width={22} height={22} strokeWidth={2} /> : todo.emoji || '✓'}
      </button>

      <button type="button" className={styles.body} onClick={() => onEdit(todo)}>
        <span className={`${styles.title} ${completing ? styles.titleDone : ''}`}>{todo.title}</span>
        <span className={styles.tags}>
          <span className="tag">Last: {formatLastLabel(lastCompletedOn)}</span>
          <span className={nextTagClassName}>Next: {formatNextLabel(todo)}</span>
          <span className="tag">Target: {formatTargetLabel(todo)}</span>
        </span>
      </button>
    </li>
  )
}
