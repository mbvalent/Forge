'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DayPicker } from './day-picker'
import { ExerciseCard } from './exercise-card'
import { ExerciseSearch } from './exercise-search'
import { getExercisesForDay } from '@/lib/workout/queries'
import { finishWorkout } from '@/lib/actions/workout'
import type {
  WorkoutData,
  WorkoutDay,
  WorkoutDayExercise,
  WorkoutSet,
} from '@/lib/workout/types'

interface WorkoutViewProps {
  date: string
  workout: WorkoutData | null
  workoutDays: WorkoutDay[]
  exercises: WorkoutDayExercise[]
  readonly: boolean
}

export function WorkoutView({
  date,
  workout,
  workoutDays,
  exercises: initialExercises,
  readonly,
}: WorkoutViewProps) {
  const router = useRouter()
  const [workoutId, setWorkoutId] = useState<string | null>(workout?.id ?? null)
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(workout?.workout_day_id ?? null)
  const [exercises, setExercises] = useState<WorkoutDayExercise[]>(initialExercises)
  const [adHocExercises, setAdHocExercises] = useState<WorkoutDayExercise[]>([])
  const [isFinishing, setIsFinishing] = useState(false)

  const isCompleted = !!workout?.completed_at
  const hasPlan = workoutDayId !== null

  // Get current sets from workout grouped by exercise
  const setsByExercise = (workout?.sets ?? []).reduce<Record<string, WorkoutSet[]>>((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = []
    acc[s.exercise_id]!.push(s)
    return acc
  }, {})

  async function handleWorkoutReady(newWorkoutId: string, newWorkoutDayId: string) {
    setWorkoutId(newWorkoutId)
    setWorkoutDayId(newWorkoutDayId)
    router.refresh()
  }

  async function handleFinish() {
    if (!workoutId) return
    setIsFinishing(true)
    const result = await finishWorkout(workoutId)
    if (!result.success) {
      toast.error('Failed to finish workout — try again')
      setIsFinishing(false)
    } else {
      router.refresh()
    }
  }

  function handleAdHocExercise(exercise: { id: string; name: string; muscle_group: string | null; default_rest_sec: number }) {
    // Check if already in the list
    const allIds = [...exercises, ...adHocExercises].map((e) => e.exercise.id)
    if (allIds.includes(exercise.id)) {
      toast.info(`${exercise.name} is already in your workout`)
      return
    }

    const adHoc: WorkoutDayExercise = {
      id: `adhoc-${exercise.id}`,
      position: 999 + adHocExercises.length,
      target_sets: 3,
      target_rir_label: null,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        default_rep_min: null,
        default_rep_max: null,
        default_rest_sec: exercise.default_rest_sec,
      },
      last_session: null,
    }
    setAdHocExercises((prev) => [...prev, adHoc])
  }

  // Show day picker if no workout started yet
  if (!hasPlan && !readonly) {
    return (
      <DayPicker
        date={date}
        workoutDays={workoutDays}
        onWorkoutReady={handleWorkoutReady}
      />
    )
  }

  if (!hasPlan && readonly) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">No workout logged for this day.</p>
    )
  }

  const allExercises = [...exercises, ...adHocExercises]

  return (
    <div className="space-y-3">
      {/* Completion status */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
            Complete
          </Badge>
        </div>
      )}

      {/* Exercise list */}
      {allExercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          currentSets={setsByExercise[ex.exercise.id] ?? []}
          workoutId={workoutId}
          readonly={readonly || isCompleted}
        />
      ))}

      {/* Ad-hoc exercise search */}
      {!readonly && !isCompleted && (
        <ExerciseSearch
          onSelect={handleAdHocExercise}
          disabled={!workoutId}
        />
      )}

      {/* Finish workout button */}
      {!readonly && !isCompleted && workoutId && (
        <>
          <Separator className="opacity-20" />
          <Button
            className="w-full min-h-[56px]"
            onClick={handleFinish}
            disabled={isFinishing}
          >
            {isFinishing ? 'Finishing…' : 'Finish Workout'}
          </Button>
        </>
      )}
    </div>
  )
}
