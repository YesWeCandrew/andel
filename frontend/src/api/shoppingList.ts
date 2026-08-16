import { api } from './client'
import type {
  AddShoppingListItemInput,
  Product,
  ProductSuggestion,
  ShoppingListItem,
  Unit,
  UpdateShoppingListItemInput,
} from '../../../shared/shopping_list'

export type { AddShoppingListItemInput, Product, ProductSuggestion, ShoppingListItem, Unit, UpdateShoppingListItemInput }

export const shoppingListApi = {
  list: () => api.get<ShoppingListItem[]>('/shopping_list'),
  create: (input: AddShoppingListItemInput) => api.post<ShoppingListItem>('/shopping_list', input),
  update: (id: number, input: UpdateShoppingListItemInput) => api.patch<ShoppingListItem>(`/shopping_list/${id}`, input),
  complete: (id: number) => api.post<ShoppingListItem>(`/shopping_list/${id}/complete`),
  remove: (ids: number[]) => api.delete<ShoppingListItem[]>(`/shopping_list?ids=${ids.join(',')}`),
}

export const productApi = {
  search: (q: string) => api.get<ProductSuggestion[]>(`/product?q=${encodeURIComponent(q)}`),
  remove: (id: number) => api.delete<Product>(`/product/${id}`),
}

export const unitApi = {
  list: () => api.get<Unit[]>('/unit'),
}
