// Wire-format contract for the /meal_plan endpoints.
// Dates travel over JSON as ISO strings; the backend converts to/from Date at the DB boundary.
// `date` itself is a plain 'YYYY-MM-DD' calendar date (no time/timezone component).
export interface MealPlanEntry {
  id: number
  date: string
  sort_order: number
  recipe_id: number | null
  note: string | null
  created_on: string
  recipe: { id: number; name: string; photo_path: string | null } | null
}

export interface CreateMealPlanEntryInput {
  date: string
  recipe_id?: number
  note?: string
}

export interface ReorderMealPlanInput {
  date: string
  entryIds: number[]
}
