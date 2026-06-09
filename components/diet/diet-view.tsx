import { getMacrosForDate } from '@/lib/diet/macros'
import { MacroTotalsBar } from './macro-totals-bar'
import { MealCard } from './meal-card'

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner', 'prebed'] as const

interface DietViewProps {
  date: string
}

export async function DietView({ date }: DietViewProps) {
  const { meals, totals, targets, isTrainingDay } = await getMacrosForDate(date)

  const mealsByType = Object.fromEntries(meals.map((m) => [m.meal_type, m]))

  return (
    <div className="space-y-3">
      <MacroTotalsBar totals={totals} targets={targets} isTrainingDay={isTrainingDay} />

      {MEAL_TYPES.map((mealType) => {
        const meal = mealsByType[mealType]
        return (
          <MealCard
            key={mealType}
            mealType={mealType}
            items={meal?.meal_items ?? []}
            date={date}
          />
        )
      })}
    </div>
  )
}
