import { useCallback, useEffect, useState } from 'react'
import { mealPlanApi } from '../api/mealplan'
import type { CreateMealPlanEntryInput, MealPlanEntry } from '../api/mealplan'

// Fetches meal plan entries for a date range and re-fetches the whole range
// after every mutation — same convention as useRecipes/useShoppingList (a
// household's planned meals over a few weeks is a small dataset, so a full
// refresh is simpler and safer than hand-rolled cache patching).
export function useMealPlan(start: string, end: string) {
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await mealPlanApi.list(start, end)
      setEntries(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const create = useCallback(
    async (input: CreateMealPlanEntryInput) => {
      await mealPlanApi.create(input)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: number) => {
      await mealPlanApi.remove(id)
      await refresh()
    },
    [refresh],
  )

  const reorder = useCallback(
    async (date: string, entryIds: number[]) => {
      await mealPlanApi.reorder(date, entryIds)
      await refresh()
    },
    [refresh],
  )

  return { entries, loading, error, refresh, create, remove, reorder }
}
