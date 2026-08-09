import { api } from './client'
import type { Todo, TodoLog, CreateTodoInput, UpdateTodoInput } from '../../../shared/todo'

export type { Todo, TodoLog, CreateTodoInput, UpdateTodoInput }

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
