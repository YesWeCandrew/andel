import { useCallback } from 'react'
import { mealPlanApi } from '../api/mealplan'
import type { CreateMealPlanEntryInput } from '../api/mealplan'
import { useAsyncList } from './useAsyncList'

// Fetches meal plan entries for a date range and re-fetches the whole range
// after every mutation.
export function useMealPlan(start: string, end: string) {
  const fetcher = useCallback(() => mealPlanApi.list(start, end), [start, end])
  const { data, loading, error, refresh } = useAsyncList(fetcher, 'Failed to load meal plan')
  const entries = data ?? []

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
