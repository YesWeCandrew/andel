import type { RecipeSummary } from '../api/recipe'

/** Matches a recipe's name, description, or any ingredient name (case-insensitive substring). */
export function filterRecipes(recipes: RecipeSummary[], query: string): RecipeSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return recipes

  return recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q) ||
      r.ingredientNames.some((name) => name.toLowerCase().includes(q)),
  )
}
