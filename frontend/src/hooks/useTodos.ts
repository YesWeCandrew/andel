import { useCallback, useEffect, useState } from 'react'
import { todoLogApi, todosApi } from '../api/todos'
import type { CreateTodoInput, Todo, TodoLog, UpdateTodoInput } from '../api/todos'

// Centralizes fetching + mutating todos so TodoWidget only has to deal with
// display state (which form is open, which item is being edited, etc). Every
// mutation re-fetches — the dataset is small (a household's worth of chores)
// so a full refresh is simpler and safer than hand-rolled cache patching.
export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [logs, setLogs] = useState<TodoLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [nextTodos, nextLogs] = await Promise.all([todosApi.list(), todoLogApi.list()])
      setTodos(nextTodos)
      setLogs(nextLogs)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load to dos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Intentional fetch-on-mount with no data-fetching library in this
    // project yet; `refresh` itself guards all setState calls behind the
    // network await, so this doesn't cause a synchronous render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const create = useCallback(
    async (input: CreateTodoInput) => {
      await todosApi.create(input)
      await refresh()
    },
    [refresh],
  )

  const update = useCallback(
    async (id: number, input: UpdateTodoInput) => {
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
