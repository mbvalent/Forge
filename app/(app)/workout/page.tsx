import { format } from 'date-fns'
import { DateNav } from '@/components/nav/date-nav'
import { WorkoutView } from '@/components/workout/workout-view'
import { getWorkoutForDate, getWorkoutDays, getExercisesForDay } from '@/lib/workout/queries'

interface WorkoutPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function WorkoutPage({ searchParams }: WorkoutPageProps) {
  const { date: dateParam } = await searchParams
  const serverToday = format(new Date(), 'yyyy-MM-dd')

  let date = serverToday
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    date = dateParam
  }

  const [workout, workoutDays] = await Promise.all([
    getWorkoutForDate(date),
    getWorkoutDays(),
  ])

  const exercises = workout?.workout_day_id
    ? await getExercisesForDay(workout.workout_day_id, date)
    : []

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold">Workout</h1>

      <DateNav date={date} basePath="/workout" />

      <WorkoutView
        date={date}
        workout={workout}
        workoutDays={workoutDays}
        exercises={exercises}
      />
    </div>
  )
}
