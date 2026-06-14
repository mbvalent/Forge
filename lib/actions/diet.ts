'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import {
  logMealItemSchema,
  updateMealItemSchema,
  deleteMealItemSchema,
  createFoodSchema,
} from '@/lib/schemas/diet'

export async function logMealItem(
  date: string,
  mealType: string,
  foodId: string,
  quantityG: number
) {
  const parsed = logMealItemSchema.safeParse({ date, mealType, foodId, quantityG })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()

  // Upsert the meal slot (creation-only for logged_at)
  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .upsert(
      { date: parsed.data.date, meal_type: parsed.data.mealType },
      { onConflict: 'date,meal_type', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (mealError || !meal) return { success: false, error: 'Failed to create meal' }

  const { error: itemError } = await supabase.from('meal_items').insert({
    meal_id: meal.id,
    food_id: parsed.data.foodId,
    quantity_g: parsed.data.quantityG,
  })

  if (itemError) return { success: false, error: 'Failed to log item' }

  revalidatePath('/')
  revalidatePath('/diet')
  return { success: true }
}

export async function updateMealItem(mealItemId: string, quantityG: number) {
  const parsed = updateMealItemSchema.safeParse({ mealItemId, quantityG })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('meal_items')
    .update({ quantity_g: parsed.data.quantityG })
    .eq('id', parsed.data.mealItemId)

  if (error) return { success: false, error: 'Failed to update item' }

  revalidatePath('/')
  revalidatePath('/diet')
  return { success: true }
}

export async function deleteMealItem(mealItemId: string) {
  const parsed = deleteMealItemSchema.safeParse({ mealItemId })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('meal_items')
    .delete()
    .eq('id', parsed.data.mealItemId)

  if (error) return { success: false, error: 'Failed to delete item' }

  revalidatePath('/')
  revalidatePath('/diet')
  return { success: true }
}

export async function createFood(
  name: string,
  calories100g: number,
  protein100g: number,
  carbs100g: number,
  fat100g: number
) {
  const parsed = createFoodSchema.safeParse({
    name,
    calories100g,
    protein100g,
    carbs100g,
    fat100g,
  })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('foods')
    .insert({
      name: parsed.data.name,
      calories_100g: parsed.data.calories100g,
      protein_100g: parsed.data.protein100g,
      carbs_100g: parsed.data.carbs100g,
      fat_100g: parsed.data.fat100g,
    })
    .select('id, name, calories_100g, protein_100g, carbs_100g, fat_100g')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `A food named "${parsed.data.name}" already exists` }
    }
    return { success: false, error: 'Failed to create food' }
  }

  return { success: true, food: data }
}

export async function toggleSupplement(date: string, supplement: string) {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('supplement_logs')
    .select('id')
    .eq('date', date)
    .eq('supplement', supplement)
    .maybeSingle()

  if (existing) {
    await supabase.from('supplement_logs').delete().eq('id', existing.id)
  } else {
    await supabase.from('supplement_logs').insert({ date, supplement })
  }

  revalidatePath('/')
  revalidatePath('/diet')
  return { success: true }
}

export async function getSupplementsForDate(date: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('supplement_logs')
    .select('supplement')
    .eq('date', date)
  return (data ?? []).map((r) => r.supplement)
}

export async function searchFoods(query: string) {
  if (!query.trim()) return { foods: [] }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('foods')
    .select('id, name, calories_100g, protein_100g, carbs_100g, fat_100g')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
    .limit(20)

  if (error) return { foods: [] }
  return { foods: data ?? [] }
}
