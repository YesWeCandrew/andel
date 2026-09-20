import type { ShoppingListItem } from '../../api/shoppingList'
import { formatQuantity } from '../../lib/format'

export function formatItemQuantity(item: ShoppingListItem): string {
  return formatQuantity(item.quantity ?? 1, item.unit)
}
