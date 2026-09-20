import type { Todo, TodoLog } from '../../api/todos'
import { formatRelativeToNow, startOfDay } from '../../lib/date'

export type TodoStatus = 'overdue' | 'due-today' | 'upcoming' | 'unscheduled'

export { formatRelativeToNow }

/** Where a todo sits relative to today, based on next_completion_on. */
export function getTodoStatus(todo: Todo, now: Date = new Date()): TodoStatus {
  if (!todo.next_completion_on) return 'unscheduled'

  const due = startOfDay(new Date(todo.next_completion_on)).getTime()
  const today = startOfDay(now).getTime()

  if (due < today) return 'overdue'
  if (due === today) return 'due-today'
  return 'upcoming'
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