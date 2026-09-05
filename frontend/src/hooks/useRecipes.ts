import { useCallback, useEffect, useState } from 'react'
import { recipeApi } from '../api/recipe'
import type { RecipeSummary } from '../api/recipe'

// Fetches the recipe list (summary shape — no ingredients) for the widget's
// tile/full-list views. Mutations re-fetch in full, same convention as
// useShoppingList — the dataset is household-scale, so this is simpler and
// safer than hand-rolled cache patching.
export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await recipeApi.list()
      setRecipes(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const remove = useCallback(
    async (id: number) => {
      await recipeApi.remove(id)
      await refresh()
    },
    [refresh],
  )

  return { recipes, loading, error, refresh, remove }
}
