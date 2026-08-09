// Wire-format contract for the /todo and /todo_log endpoints.
// Dates travel over JSON as ISO strings; the backend converts to/from Date at the DB boundary.
export interface Todo {
  id: number
  title: string
  active: boolean
  emoji: string | null
  notes: string | null
  frequency_days: number | null
  next_completion_on: string | null
  created_on: string
}

export interface TodoLog {
  id: number
  todo_id: number | null
  completed_on: string
}

export interface UpsertTodoInput {
  title?: string
  active: boolean
  emoji?: string
  notes?: string
  frequency_days?: number
  next_completion_on?: string
}