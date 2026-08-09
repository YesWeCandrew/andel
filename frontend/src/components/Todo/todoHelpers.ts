import type { Todo, TodoLog } from '../../api/todos'

export type TodoStatus = 'overdue' | 'due-today' | 'upcoming' | 'unscheduled'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Where a todo sits relative to today, based on next_completion_on. */
export function getTodoStatus(todo: Todo, now: Date = new Date()): TodoStatus {
  if (!todo.next_completion_on) return 'unscheduled'

  const due = startOfDay(new Date(todo.next_completion_on)).getTime()
  const today = startOfDay(now).getTime()

  if (due < today) return 'overdue'
  if (due === today) return 'due-today'
  return 'upcoming'
}

/** "today" / "tomorrow" / "in 3 days" / "2 days ago", relative to now. */
export function formatRelativeToNow(dateInput: string | Date, now: Date = new Date()): string {
  const date = startOfDay(new Date(dateInput))
  const today = startOfDay(now)
  const diffDays = Math.round((date.getTime() - today.getTime()) / DAY_MS)

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays === -1) return 'yesterday'
  if (diffDays > 1) return `in ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

export function formatNextLabel(todo: Todo): string {
  return todo.next_completion_on ? formatRelativeToNow(todo.next_completion_on) : 'not scheduled'
}

export function formatLastLabel(lastCompletedOn: string | null): string {
  return lastCompletedOn ? formatRelativeToNow(lastCompletedOn) : 'never'
}

export function formatTargetLabel(todo: Todo): string {
  if (!todo.frequency_days) return 'one-off'
  return `every ${todo.frequency_days} day${todo.frequency_days === 1 ? '' : 's'}`
}

/** Most recent completed_on per todo_id, for the "Last: …" tag. */
export function getLastCompletedMap(logs: TodoLog[]): Record<number, string> {
  const map: Record<number, string> = {}

  for (const log of logs) {
    if (log.todo_id == null) continue
    const existing = map[log.todo_id]
    if (!existing || new Date(log.completed_on) > new Date(existing)) {
      map[log.todo_id] = log.completed_on
    }
  }

  return map
}