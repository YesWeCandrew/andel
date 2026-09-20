import { useCallback } from 'react'
import { recipeApi } from '../api/recipe'
import { useAsyncList } from './useAsyncList'

// Fetches the recipe list (summary shape — no ingredients) for the widget's
// tile/full-list views.
export function useRecipes() {
  const fetcher = useCallback(() => recipeApi.list(), [])
  const { data, loading, error, refresh } = useAsyncList(fetcher, 'Failed to load recipes')
  const recipes = data ?? []

  const remove = useCallback(
    async (id: number) => {
      await recipeApi.remove(id)
      await refresh()
    },
    [refresh],
  )

  return { recipes, loading, error, refresh, remove }
}
