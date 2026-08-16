import { useCallback, useEffect, useState } from 'react'
import { shoppingListApi, unitApi } from '../api/shoppingList'
import type { AddShoppingListItemInput, ShoppingListItem, Unit, UpdateShoppingListItemInput } from '../api/shoppingList'

// Centralizes fetching + mutating the shopping list so ShoppingListWidget only
// has to deal with display state. Every mutation re-fetches — the dataset is
// small (a household's worth of groceries) so a full refresh is simpler and
// safer than hand-rolled cache patching (see useTodos for the same call).
export function useShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [nextItems, nextUnits] = await Promise.all([shoppingListApi.list(), unitApi.list()])
      setItems(nextItems)
      setUnits(nextUnits)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shopping list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const create = useCallback(
    async (input: AddShoppingListItemInput) => {
      await shoppingListApi.create(input)
      await refresh()
    },
    [refresh],
  )

  const update = useCallback(
    async (id: number, input: UpdateShoppingListItemInput) => {
      await shoppingListApi.update(id, input)
      await refresh()
    },
    [refresh],
  )

  const complete = useCallback(
    async (id: number) => {
      await shoppingListApi.complete(id)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (ids: number[]) => {
      await shoppingListApi.remove(ids)
      await refresh()
    },
    [refresh],
  )

  return { items, units, loading, error, refresh, create, update, complete, remove }
}
