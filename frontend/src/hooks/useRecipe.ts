import { useCallback } from 'react'
import { recipeApi } from '../api/recipe'
import { useAsyncList } from './useAsyncList'

// Fetches one full recipe (with ingredients joined in) by id — used by the
// detail view, and by the edit form to preload its initial values.
export function useRecipe(id: number | undefined) {
  const fetcher = useCallback(() => (id === undefined ? Promise.resolve(null) : recipeApi.get(id)), [id])
  const { data, loading, error, refresh } = useAsyncList(fetcher, 'Failed to load recipe', id !== undefined)

  return { recipe: data ?? null, loading, error, refresh }
}
