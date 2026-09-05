import { useEffect, useState } from 'react'
import { unitApi } from '../api/shoppingList'
import type { Unit } from '../api/shoppingList'

// Small standalone fetch for the unit list, for forms that offer unit
// suggestions but aren't already backed by a richer hook like useShoppingList.
export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([])

  useEffect(() => {
    unitApi.list().then(setUnits).catch(() => setUnits([]))
  }, [])

  return units
}
