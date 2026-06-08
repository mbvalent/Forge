'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import {
  createOrResumeWorkoutSchema,
  logSetSchema,
  updateSetSchema,
  deleteSetSchema,
  finishWorkoutSchema,
  searchExercisesSchema,
  type ActionResult,
} from '@/lib/workout/types'

export async function createOrResumeWorkout(
  date: string,
  workoutDayId: string
): Promise<ActionResult<{ workoutId: string }>> {
  const parsed = createOrResumeWorkoutSchema.safeParse({ date, workoutDayId })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workouts')
    .upsert(
      { date: parsed.data.date, workout_day_id: parsed.data.workoutDayId },
      { onConflict: 'date' }
    )
    .select('id')
    .single()

  if (error || !data) return { success: false, error: 'Failed to create workout' }

  revalidatePath('/')
  revalidatePath('/workout')
  return { success: true, data: { workoutId: data.id } }
}

export async function logSet(
  workoutId: string,
  exerciseId: string,
  setNumber: number,
  weightKg: number,
  reps: number,
  rir: number | null
): Promise<ActionResult> {
  const parsed = logSetSchema.safeParse({ workoutId, exerciseId, setNumber, weightKg, reps, rir })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase.from('workout_sets').insert({
    workout_id: parsed.data.workoutId,
    exercise_id: parsed.data.exerciseId,
    set_number: parsed.data.setNumber,
    weight_kg: parsed.data.weightKg,
    reps: parsed.data.reps,
    rir: parsed.data.rir,
  })

  if (error) return { success: false, error: 'Failed to log set' }

  revalidatePath('/')
  revalidatePath('/workout')
  return { success: true }
}

export async function updateSet(
  setId: string,
  weightKg: number,
  reps: number,
  rir: number | null
): Promise<ActionResult> {
  const parsed = updateSetSchema.safeParse({ setId, weightKg, reps, rir })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('workout_sets')
    .update({
      weight_kg: parsed.data.weightKg,
      reps: parsed.data.reps,
      rir: parsed.data.rir,
    })
    .eq('id', parsed.data.setId)

  if (error) return { success: false, error: 'Failed to update set' }

  revalidatePath('/')
  revalidatePath('/workout')
  return { success: true }
}

export async function deleteSet(setId: string): Promise<ActionResult> {
  const parsed = deleteSetSchema.safeParse({ setId })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('workout_sets')
    .delete()
    .eq('id', parsed.data.setId)

  if (error) return { success: false, error: 'Failed to delete set' }

  revalidatePath('/')
  revalidatePath('/workout')
  return { success: true }
}

export async function finishWorkout(workoutId: string): Promise<ActionResult> {
  const parsed = finishWorkoutSchema.safeParse({ workoutId })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('workouts')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', parsed.data.workoutId)

  if (error) return { success: false, error: 'Failed to finish workout' }

  revalidatePath('/')
  revalidatePath('/workout')
  return { success: true }
}

export async function searchExercises(query: string) {
  const parsed = searchExercisesSchema.safeParse({ query })
  if (!parsed.success) return { exercises: [] }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, default_rest_sec')
    .ilike('name', `%${parsed.data.query}%`)
    .order('name')
    .limit(20)

  if (error) return { exercises: [] }
  return { exercises: data ?? [] }
}
