import 'server-only'
import { createServiceClient } from '@/lib/supabase'
import { TRAINING_TARGETS, REST_TARGETS, type MacroTargets } from './targets'
import { sumMacros } from './compute'
import type { MealData, MacroTotals } from './types'

export type { MealData, MacroTotals } from './types'
export type { MacroTargets } from './targets'

export interface DayMacros {
  meals: MealData[]
  totals: MacroTotals
  targets: MacroTargets
  isTrainingDay: boolean
}

export async function getMacrosForDate(date: string): Promise<DayMacros> {
  const supabase = createServiceClient()

  const [mealsResult, workoutResult] = await Promise.all([
    supabase
      .from('meals')
      .select(
        `id, meal_type, logged_at,
         meal_items (
           id, quantity_g,
           food:foods ( id, name, calories_100g, protein_100g, carbs_100g, fat_100g )
         )`
      )
      .eq('date', date),
    supabase
      .from('workouts')
      .select('id, workout_sets(id)')
      .eq('date', date)
      .maybeSingle(),
  ])

  const meals = (mealsResult.data ?? []) as unknown as MealData[]
  const isTrainingDay = (workoutResult.data?.workout_sets?.length ?? 0) > 0

  const allItems = meals.flatMap((m) => m.meal_items)
  const totals = sumMacros(allItems)
  const targets = isTrainingDay ? TRAINING_TARGETS : REST_TARGETS

  return { meals, totals, targets, isTrainingDay }
}
