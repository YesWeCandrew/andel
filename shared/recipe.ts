// Wire-format contract for the /recipes endpoints.
// Dates travel over JSON as ISO strings; the backend converts to/from Date at the DB boundary.
export interface RecipeIngredient {
  id: number
  product_id: number
  product: string
  unit_id: number | null
  unit: string | null
  quantity: number
  sort_order: number
}

export interface Recipe {
  id: number
  name: string
  description: string | null
  steps: string | null
  servings: number
  photo_path: string | null
  created_on: string
  ingredients: RecipeIngredient[]
}

// The list/tile shape — skips ingredient quantity/unit detail (the card only
// shows name/photo/description), but keeps ingredient product names so the
// full-list search can match against them without a second round trip.
export interface RecipeSummary {
  id: number
  name: string
  description: string | null
  photo_path: string | null
  ingredientNames: string[]
}

export interface RecipeIngredientInput {
  product: string
  quantity: number
  unit?: string
}

export interface CreateRecipeInput {
  name: string
  description?: string
  steps?: string
  servings?: number
  ingredients: RecipeIngredientInput[]
}

export interface UpdateRecipeInput {
  name?: string
  description?: string
  steps?: string
  servings?: number
  ingredients?: RecipeIngredientInput[]
}

export interface AddRecipeIngredientToListInput {
  /** Already scaled to whatever servings the caller has selected. */
  quantity: number
}

export interface AddAllRecipeIngredientsToListInput {
  ingredients: { ingredientId: number; quantity: number }[]
}

// Scales a base ingredient quantity (stored against the recipe's base
// servings) to a target servings count, rounded to 2dp for display/add.
export function scaleQuantity(baseQuantity: number, baseServings: number, targetServings: number): number {
  if (!baseServings) return baseQuantity
  const scaled = (baseQuantity * targetServings) / baseServings
  return Math.round(scaled * 100) / 100
}
