import { api } from './client'
import type { CreateMealPlanEntryInput, MealPlanEntry } from '../../../shared/meal_plan'

export type { CreateMealPlanEntryInput, MealPlanEntry } from '../../../shared/meal_plan'

export const mealPlanApi = {
  list: (start: string, end: string) => api.get<MealPlanEntry[]>(`/meal_plan?start=${start}&end=${end}`),
  create: (input: CreateMealPlanEntryInput) => api.post<MealPlanEntry>('/meal_plan', input),
  remove: (id: number) => api.delete<MealPlanEntry>(`/meal_plan/${id}`),
  reorder: (date: string, entryIds: number[]) =>
    api.post<MealPlanEntry[]>('/meal_plan/reorder', { date, entryIds }),
}
