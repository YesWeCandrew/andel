import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../lib/errors'

/**
 * Generic fetch/loading/error/refresh skeleton shared by every resource hook
 * in this app (useTodos, useShoppingList, useRecipes, useRecipe, useMealPlan)
 * — each just supplies its own fetcher and shapes `data` into what its
 * callers expect. Every mutation is expected to call `refresh()` afterwards
 * rather than patch `data` locally (the datasets here are household-scale,
 * so a full refetch is simpler and safer than hand-rolled cache patching).
 */
export function useAsyncList<T>(fetcher: () => Promise<T>, errorFallback: string, initialLoading = true) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await fetcher()
      setData(next)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, errorFallback))
    } finally {
      setLoading(false)
    }
  }, [fetcher, errorFallback])

  useEffect(() => {
    // Intentional fetch-on-mount with no data-fetching library in this
    // project yet; `refresh` itself guards all setState calls behind the
    // network await, so this doesn't cause a synchronous render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
