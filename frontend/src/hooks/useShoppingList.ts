import { useCallback } from 'react'
import { shoppingListApi, unitApi } from '../api/shoppingList'
import type { AddShoppingListItemInput, ShoppingListItem, Unit, UpdateShoppingListItemInput } from '../api/shoppingList'
import { useAsyncList } from './useAsyncList'

export function useShoppingList() {
  const fetcher = useCallback(() => Promise.all([shoppingListApi.list(), unitApi.list()]), [])
  const { data, loading, error, refresh } = useAsyncList(fetcher, 'Failed to load shopping list')
  const [items, units]: [ShoppingListItem[], Unit[]] = data ?? [[], []]

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
