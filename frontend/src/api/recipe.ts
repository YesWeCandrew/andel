import { api } from './client'
import type { ShoppingListItem } from './shoppingList'
import type {
  CreateRecipeInput,
  Recipe,
  RecipeSummary,
  UpdateRecipeInput,
} from '../../../shared/recipe'

export type { CreateRecipeInput, Recipe, RecipeIngredient, RecipeIngredientInput, RecipeSummary, UpdateRecipeInput } from '../../../shared/recipe'
export { scaleQuantity } from '../../../shared/recipe'

export const recipeApi = {
  list: () => api.get<RecipeSummary[]>('/recipes'),
  get: (id: number) => api.get<Recipe>(`/recipes/${id}`),
  create: (input: CreateRecipeInput) => api.post<Recipe>('/recipes', input),
  update: (id: number, input: UpdateRecipeInput) => api.patch<Recipe>(`/recipes/${id}`, input),
  remove: (id: number) => api.delete<Recipe>(`/recipes/${id}`),
  uploadPhoto: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.upload<Recipe>(`/recipes/${id}/photo`, formData)
  },
  addIngredientToList: (recipeId: number, ingredientId: number, quantity: number) =>
    api.post<ShoppingListItem>(`/recipes/${recipeId}/ingredients/${ingredientId}/add-to-list`, { quantity }),
  addAllToList: (recipeId: number, ingredients: { ingredientId: number; quantity: number }[]) =>
    api.post<ShoppingListItem[]>(`/recipes/${recipeId}/add-all-to-list`, { ingredients }),
}
