import 'server-only'

import { createServiceClient } from '@/lib/supabase'
import type {
  WorkoutData,
  WorkoutDayExercise,
  WorkoutDay,
  WorkoutSummary,
  LastSession,
} from './types'

export async function getWorkoutForDate(date: string): Promise<WorkoutData | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workouts')
    .select(
      'id, date, workout_day_id, completed_at, workout_sets(id, exercise_id, set_number, weight_kg, reps, rir)'
    )
    .eq('date', date)
    .maybeSingle()
  return (data as WorkoutData | null) ?? null
}

export async function getWorkoutDays(): Promise<WorkoutDay[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workout_days')
    .select('id, day_number, label')
    .order('day_number')
  return (data as WorkoutDay[]) ?? []
}

export async function getExercisesForDay(
  workoutDayId: string,
  today: string
): Promise<WorkoutDayExercise[]> {
  const supabase = createServiceClient()
  const { data: dayExercises } = await supabase
    .from('workout_day_exercises')
    .select(
      `id, position, target_sets, target_rir,
       exercise:exercises(id, name, muscle_group, default_rep_min, default_rep_max, default_rest_sec)`
    )
    .eq('workout_day_id', workoutDayId)
    .order('position')

  if (!dayExercises) return []

  const lastSessions = await Promise.all(
    dayExercises.map((de) => {
      const ex = de.exercise as unknown as Exercise
      return getLastSessionSets(ex.id, today)
    })
  )

  return dayExercises.map((de, i) => ({
    id: de.id,
    position: de.position,
    target_sets: de.target_sets,
    target_rir_label: de.target_rir as string | null,
    exercise: de.exercise as unknown as Exercise,
    last_session: lastSessions[i] ?? null,
  }))
}

export async function getLastSessionSets(
  exerciseId: string,
  before: string
): Promise<LastSession | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.rpc('get_last_session_sets', {
    p_exercise_id: exerciseId,
    p_before: before,
  })
  if (!data || data.length === 0) return null
  return {
    date: data[0].workout_date as string,
    sets: (data as Array<{ weight_kg: number; reps: number; rir: number | null }>).map((r) => ({
      weight_kg: r.weight_kg,
      reps: r.reps,
      rir: r.rir,
    })),
  }
}

export async function getWorkoutSummaryForDate(date: string): Promise<WorkoutSummary | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workouts')
    .select(
      `id, date, workout_day_id, completed_at,
       workout_day:workout_days(label),
       workout_sets(id, weight_kg, reps, exercise:exercises(name))`
    )
    .eq('date', date)
    .maybeSingle()

  if (!data) return null

  const sets = (data.workout_sets ?? []) as unknown as Array<{
    id: string
    weight_kg: number
    reps: number
    exercise: { name: string } | null
  }>

  const topLift = sets.reduce(
    (best, s) => {
      if (!best || s.weight_kg > best.weight_kg) return s
      return best
    },
    null as (typeof sets)[number] | null
  )

  return {
    id: data.id,
    date: data.date,
    workout_day_id: data.workout_day_id,
    workout_day_label: (data.workout_day as unknown as { label: string } | null)?.label ?? null,
    completed_at: data.completed_at,
    set_count: sets.length,
    top_lift:
      topLift && topLift.exercise
        ? `${topLift.exercise.name} · ${topLift.weight_kg}×${topLift.reps}`
        : null,
  }
}

// Needed inside getExercisesForDay above
interface Exercise {
  id: string
  name: string
  muscle_group: string | null
  default_rep_min: number | null
  default_rep_max: number | null
  default_rest_sec: number
}
