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
  changeWorkoutDaySchema,
  updateWorkoutNotesSchema,
  updateExerciseNoteSchema,
  upsertWorkoutExerciseNoteSchema,
  updateExerciseOrderSchema,
  type ActionResult,
} from '@/lib/workout/types'

export async function createOrResumeWorkout(
  date: string,
  workoutDayId: string
): Promise<ActionResult<{ workoutId: string }>> {
  const parsed = createOrResumeWorkoutSchema.safeParse({ date, workoutDayId })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()

  // Check for existing workout first (avoids needing a DB unique constraint)
  const { data: existing } = await supabase
    .from('workouts')
    .select('id')
    .eq('date', parsed.data.date)
    .maybeSingle()

  if (existing) {
    return { success: true, data: { workoutId: existing.id } }
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert({ date: parsed.data.date, workout_day_id: parsed.data.workoutDayId })
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

export async function changeWorkoutDay(
  workoutId: string,
  newDayId: string
): Promise<ActionResult> {
  const parsed = changeWorkoutDaySchema.safeParse({ workoutId, newDayId })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()

  await Promise.all([
    supabase.from('workout_sets').delete().eq('workout_id', parsed.data.workoutId),
    supabase.from('workout_exercise_notes').delete().eq('workout_id', parsed.data.workoutId),
  ])

  const { error } = await supabase
    .from('workouts')
    .update({ workout_day_id: parsed.data.newDayId })
    .eq('id', parsed.data.workoutId)

  if (error) return { success: false, error: 'Failed to change workout day' }

  revalidatePath('/workout')
  return { success: true }
}

export async function updateWorkoutNotes(
  workoutId: string,
  notes: string
): Promise<ActionResult> {
  const parsed = updateWorkoutNotesSchema.safeParse({ workoutId, notes })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('workouts')
    .update({ notes: parsed.data.notes || null })
    .eq('id', parsed.data.workoutId)

  if (error) return { success: false, error: 'Failed to save notes' }
  return { success: true }
}

export async function updateExerciseNote(
  exerciseId: string,
  notes: string
): Promise<ActionResult> {
  const parsed = updateExerciseNoteSchema.safeParse({ exerciseId, notes })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('exercises')
    .update({ notes: parsed.data.notes || null })
    .eq('id', parsed.data.exerciseId)

  if (error) return { success: false, error: 'Failed to save note' }
  return { success: true }
}

export async function updateExerciseOrder(
  workoutId: string,
  exerciseOrder: string[]
): Promise<ActionResult> {
  const parsed = updateExerciseOrderSchema.safeParse({ workoutId, exerciseOrder })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('workouts')
    .update({ exercise_order: parsed.data.exerciseOrder })
    .eq('id', parsed.data.workoutId)

  if (error) return { success: false, error: 'Failed to save exercise order' }
  return { success: true }
}

export async function upsertWorkoutExerciseNote(
  workoutId: string,
  exerciseId: string,
  notes: string
): Promise<ActionResult> {
  const parsed = upsertWorkoutExerciseNoteSchema.safeParse({ workoutId, exerciseId, notes })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()

  if (!parsed.data.notes) {
    await supabase
      .from('workout_exercise_notes')
      .delete()
      .eq('workout_id', parsed.data.workoutId)
      .eq('exercise_id', parsed.data.exerciseId)
    return { success: true }
  }

  const { error } = await supabase
    .from('workout_exercise_notes')
    .upsert(
      {
        workout_id: parsed.data.workoutId,
        exercise_id: parsed.data.exerciseId,
        notes: parsed.data.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workout_id,exercise_id' }
    )

  if (error) return { success: false, error: 'Failed to save note' }
  return { success: true }
}
