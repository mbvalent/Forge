import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon } from '@hugeicons/core-free-icons'
import type { MealData, MealItemData } from '@/lib/diet/types'

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner', 'prebed'] as const
type MealType = typeof MEAL_TYPES[number]

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
  prebed: 'Pre-bed',
}

function computeMealMacros(items: MealItemData[]) {
  return items.reduce(
    (acc, item) => {
      const factor = item.quantity_g / 100
      return {
        calories: acc.calories + item.food.calories_100g * factor,
        protein: acc.protein + item.food.protein_100g * factor,
      }
    },
    { calories: 0, protein: 0 },
  )
}

interface MealsStripProps {
  meals: MealData[]
}

export function MealsStrip({ meals }: MealsStripProps) {
  const mealsByType = Object.fromEntries(meals.map((m) => [m.meal_type, m]))

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">
          Meals
        </p>
        <Link
          href="/diet"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Open diet →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {MEAL_TYPES.map((type) => {
          const meal = mealsByType[type]
          const items = meal?.meal_items ?? []
          const filled = items.length > 0
          const macros = filled ? computeMealMacros(items) : null

          return (
            <Link key={type} href="/diet" className="block">
              <div
                className={
                  filled
                    ? 'flex min-h-[86px] flex-col justify-between rounded-2xl bg-card px-3 py-3.5 ring-1 ring-foreground/8 transition-colors hover:bg-muted/5'
                    : 'flex min-h-[86px] flex-col justify-between rounded-2xl border border-dashed border-foreground/20 bg-transparent px-3 py-3.5 transition-colors hover:bg-muted/5'
                }
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {MEAL_LABELS[type]}
                </span>
                {filled && macros ? (
                  <div>
                    <p className="font-heading text-[19px] font-bold tabular-nums leading-none">
                      {Math.round(macros.calories)}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                      kcal · {Math.round(macros.protein)}g P
                    </p>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                    Add
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
