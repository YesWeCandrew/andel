// Wire-format contract for the /shopping_list, /product and /unit endpoints.
// Dates travel over JSON as ISO strings; the backend converts to/from Date at the DB boundary.
export interface ShoppingListItem {
  id: number
  active: boolean
  completed_on: string | null
  created_on: string
  quantity: number | null
  unit_id: number | null
  unit: string | null
  product_id: number | null
  product: string | null
}

export interface Unit {
  id: number
  unit: string | null
  active: boolean
}

export interface Product {
  id: number
  product: string | null
  active: boolean
}

/** A product autocomplete match, annotated with its most-used quantity/unit. */
export interface ProductSuggestion {
  id: number
  product: string
  suggestedQuantity: number | null
  suggestedUnitId: number | null
  suggestedUnit: string | null
}

// Adds a new item, or merges the quantity into a matching active item for
// the same product + unit. `product` is the only required field — quantity
// defaults to 1 and a blank unit means "piece".
export interface AddShoppingListItemInput {
  product: string
  quantity?: number
  unit?: string
}

export interface UpdateShoppingListItemInput {
  product?: string
  quantity?: number
  unit?: string
}
