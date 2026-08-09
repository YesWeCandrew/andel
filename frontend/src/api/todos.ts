import { api } from './client'

// Mirrors backend/src/schema.ts. Dates travel over JSON as ISO strings.
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

export interface CreateTodoInput {
  title: string
  emoji?: string
  notes?: string
  frequency_days?: number
  start_on?: string
}

export interface UpdateTodoInput {
  title?: string
  emoji?: string
  notes?: string
  frequency_days?: number
}

export const todosApi = {
  list: () => api.get<Todo[]>('/todo'),
  create: (input: CreateTodoInput) => api.post<Todo>('/todo', input),
  update: (id: number, input: UpdateTodoInput) => api.patch<Todo>(`/todo/${id}`, input),
  complete: (id: number) => api.post<Todo>(`/todo/${id}/complete`),
  remove: (ids: number[]) => api.delete<Todo[]>(`/todo?ids=${ids.join(',')}`),
}

export const todoLogApi = {
  list: () => api.get<TodoLog[]>('/todo_log'),
  listForTodo: (todoId: number) => api.get<TodoLog[]>(`/todo/${todoId}/todo_log`),
}
