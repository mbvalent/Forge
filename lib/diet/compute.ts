import type { MealItemData, MacroTotals } from './types'

export function computeItemMacros(item: MealItemData): MacroTotals {
  const ratio = item.quantity_g / 100
  return {
    calories: Math.round(ratio * item.food.calories_100g * 10) / 10,
    protein: Math.round(ratio * item.food.protein_100g * 10) / 10,
    carbs: Math.round(ratio * item.food.carbs_100g * 10) / 10,
    fat: Math.round(ratio * item.food.fat_100g * 10) / 10,
  }
}

export function sumMacros(items: MealItemData[]): MacroTotals {
  return items.reduce(
    (acc, item) => {
      const m = computeItemMacros(item)
      return {
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}
