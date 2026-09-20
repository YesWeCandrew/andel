import { useCallback } from 'react'
import { todoLogApi, todosApi } from '../api/todos'
import type { Todo, TodoLog, UpsertTodoInput } from '../api/todos'
import { useAsyncList } from './useAsyncList'

export function useTodos() {
  const fetcher = useCallback(() => Promise.all([todosApi.list(), todoLogApi.list()]), [])
  const { data, loading, error, refresh } = useAsyncList(fetcher, 'Failed to load to dos')
  const [todos, logs]: [Todo[], TodoLog[]] = data ?? [[], []]

  const create = useCallback(
    async (input: UpsertTodoInput) => {
      await todosApi.create(input)
      await refresh()
    },
    [refresh],
  )

  const update = useCallback(
    async (id: number, input: UpsertTodoInput) => {
      await todosApi.update(id, input)
      await refresh()
    },
    [refresh],
  )

  const complete = useCallback(
    async (id: number) => {
      await todosApi.complete(id)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (ids: number[]) => {
      await todosApi.remove(ids)
      await refresh()
    },
    [refresh],
  )

  return { todos, logs, loading, error, refresh, create, update, complete, remove }
}
