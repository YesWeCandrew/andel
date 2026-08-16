import type { ShoppingListItem } from '../../api/shoppingList'

/** "400 ml" / "2" — a blank unit means "piece", so it's just the number. */
export function formatItemQuantity(item: ShoppingListItem): string {
  const quantity = item.quantity ?? 1
  return item.unit ? `${quantity} ${item.unit}` : String(quantity)
}
