import { useCallback, useEffect, useState } from 'react'
import { recipeApi } from '../api/recipe'
import type { Recipe } from '../api/recipe'

// Fetches one full recipe (with ingredients joined in) by id — used by the
// detail view, and by the edit form to preload its initial values.
export function useRecipe(id: number | undefined) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(id !== undefined)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (id === undefined) return
    setLoading(true)
    try {
      const next = await recipeApi.get(id)
      setRecipe(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  return { recipe, loading, error, refresh }
}
