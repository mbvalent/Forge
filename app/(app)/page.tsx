import { format } from 'date-fns'
import { getMacrosForDate } from '@/lib/diet/macros'
import { getWorkoutSummaryForDate } from '@/lib/workout/queries'
import { getLatestWeightLog } from '@/lib/weight/queries'
import { getStreakCount } from '@/lib/today/streak'
import { TodayHeader } from '@/components/today/today-header'
import { NutritionCard } from '@/components/today/nutrition-card'
import { WorkoutTile } from '@/components/today/workout-tile'
import { WeightTile } from '@/components/today/weight-tile'
import { MealsStrip } from '@/components/today/meals-strip'
import { AICoachCard } from '@/components/today/ai-coach-card'
import { TodayRedirect } from './today-redirect'

interface TodayPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const { date: dateParam } = await searchParams
  const serverToday = format(new Date(), 'yyyy-MM-dd')
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : serverToday

  const [dayMacros, workoutSummary, weightLog, streak] = await Promise.all([
    getMacrosForDate(date),
    getWorkoutSummaryForDate(date),
    getLatestWeightLog(),
    getStreakCount(),
  ])

  const { totals, targets, isTrainingDay, meals } = dayMacros

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8 md:px-10">
      <TodayRedirect serverDate={serverToday} />

      <div className="flex flex-col gap-3.5">
        <TodayHeader date={date} isTrainingDay={isTrainingDay} streak={streak} />

        {/* Hero grid */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[1.3fr_1fr]">
          <NutritionCard totals={totals} targets={targets} />
          <div className="flex flex-col gap-3.5">
            <WorkoutTile summary={workoutSummary} isTrainingDay={isTrainingDay} />
            <WeightTile log={weightLog} />
          </div>
        </div>

        <MealsStrip meals={meals} />

        <AICoachCard date={date} />
      </div>
    </div>
  )
}
