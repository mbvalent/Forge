import { z } from 'zod'

export const logMealItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  mealType: z.enum(['breakfast', 'lunch', 'snack', 'dinner', 'prebed']),
  foodId: z.string().uuid(),
  quantityG: z.number().min(1).max(5000),
})

export const updateMealItemSchema = z.object({
  mealItemId: z.string().uuid(),
  quantityG: z.number().min(1).max(5000),
})

export const deleteMealItemSchema = z.object({
  mealItemId: z.string().uuid(),
})

export const createFoodSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  calories100g: z.number().min(0).max(900),
  protein100g: z.number().min(0).max(100),
  carbs100g: z.number().min(0).max(100),
  fat100g: z.number().min(0).max(100),
})

export type LogMealItemInput = z.infer<typeof logMealItemSchema>
export type UpdateMealItemInput = z.infer<typeof updateMealItemSchema>
export type CreateFoodInput = z.infer<typeof createFoodSchema>
