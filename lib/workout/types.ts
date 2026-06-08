import { z } from 'zod'

// --- Zod schemas ---

export const createOrResumeWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutDayId: z.string().uuid(),
})

export const logSetSchema = z.object({
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(1).max(100),
  rir: z.number().int().min(0).max(4).nullable(),
})

export const updateSetSchema = z.object({
  setId: z.string().uuid(),
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(1).max(100),
  rir: z.number().int().min(0).max(4).nullable(),
})

export const deleteSetSchema = z.object({ setId: z.string().uuid() })
export const finishWorkoutSchema = z.object({ workoutId: z.string().uuid() })
export const searchExercisesSchema = z.object({
  query: z.string().trim().min(1).max(100),
})

// --- TypeScript interfaces ---

export type ActionResult<T = never> =
  | { success: true; data?: T }
  | { success: false; error: string }

export interface SetSavedPayload {
  exerciseId: string
  restSec: number
}

export interface Exercise {
  id: string
  name: string
  muscle_group: string | null
  default_rep_min: number | null
  default_rep_max: number | null
  default_rest_sec: number
}

export interface WorkoutSet {
  id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  rir: number | null
}

export interface LastSession {
  date: string
  sets: Array<{ weight_kg: number; reps: number; rir: number | null }>
}

export interface WorkoutDayExercise {
  id: string
  position: number
  target_sets: number
  target_rir_label: string | null
  exercise: Exercise
  last_session: LastSession | null
}

export interface WorkoutDay {
  id: string
  day_number: number
  label: string
}

export interface WorkoutData {
  id: string
  date: string
  workout_day_id: string | null
  completed_at: string | null
  sets: WorkoutSet[]
}

export interface WorkoutSummary {
  id: string
  date: string
  workout_day_id: string | null
  workout_day_label: string | null
  completed_at: string | null
  set_count: number
  top_lift: string | null
}
