export interface FoodData {
  id: string
  name: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
}

export interface MealItemData {
  id: string
  quantity_g: number
  food: FoodData
}

export interface MealData {
  id: string
  meal_type: string
  logged_at: string
  meal_items: MealItemData[]
}

export interface MacroTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}
