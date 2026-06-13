'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { DayPicker } from './day-picker'
import { ExerciseCard } from './exercise-card'
import { ExerciseSearch } from './exercise-search'
import { finishWorkout, updateWorkoutNotes, updateExerciseOrder } from '@/lib/actions/workout'
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
}

export function WorkoutView({
  date,
  workout,
  workoutDays,
  exercises: initialExercises,
}: WorkoutViewProps) {
  const isPast = date < format(new Date(), 'yyyy-MM-dd')
  const readonly = isPast || !!workout?.completed_at
  const router = useRouter()
  const [workoutId, setWorkoutId] = useState<string | null>(workout?.id ?? null)
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(workout?.workout_day_id ?? null)
  const [exercises, setExercises] = useState<WorkoutDayExercise[]>(initialExercises)
  const [adHocExercises, setAdHocExercises] = useState<WorkoutDayExercise[]>([])
  const [isFinishing, setIsFinishing] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)

  // Workout-level notes
  const [workoutNotes, setWorkoutNotes] = useState(workout?.notes ?? '')
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handleWorkoutNotesChange(value: string) {
    setWorkoutNotes(value)
    if (!workoutId) return
    clearTimeout(notesDebounce.current)
    notesDebounce.current = setTimeout(() => {
      updateWorkoutNotes(workoutId!, value)
    }, 1000)
  }

  // Sync exercises when server refreshes them (after day picker selects a day)
  useEffect(() => {
    setExercises(initialExercises)
  }, [initialExercises])

  const isCompleted = !!workout?.completed_at
  const hasPlan = workoutDayId !== null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIdx = exercises.findIndex((e) => e.exercise.id === active.id)
    const overIdx = exercises.findIndex((e) => e.exercise.id === over.id)
    if (activeIdx === -1 || overIdx === -1) return

    const newOrder = arrayMove(exercises, activeIdx, overIdx)
    setExercises(newOrder)

    if (workoutId) {
      await updateExerciseOrder(workoutId, newOrder.map((e) => e.exercise.id))
    }
  }

  // Get current sets from workout grouped by exercise
  const setsByExercise = (workout?.sets ?? []).reduce<Record<string, WorkoutSet[]>>((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = []
    acc[s.exercise_id]!.push(s)
    return acc
  }, {})

  async function handleWorkoutReady(newWorkoutId: string, newWorkoutDayId: string) {
    setWorkoutId(newWorkoutId)
    setWorkoutDayId(newWorkoutDayId)
    setShowDayPicker(false)
    setAdHocExercises([])
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
        notes: null,
      },
      last_session: null,
      session_note: null,
    }
    setAdHocExercises((prev) => [...prev, adHoc])
  }

  // Show day picker if no workout started yet, or user is changing day
  if ((!hasPlan && !readonly) || showDayPicker) {
    return (
      <DayPicker
        date={date}
        workoutDays={workoutDays}
        onWorkoutReady={handleWorkoutReady}
        existingWorkoutId={showDayPicker && workoutId ? workoutId : undefined}
        onCancel={showDayPicker ? () => setShowDayPicker(false) : undefined}
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
      {/* Status row: completion badge + change day */}
      <div className="flex items-center justify-between py-1 min-h-[28px]">
        {isCompleted ? (
          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
            Complete
          </Badge>
        ) : <span />}
        {!readonly && !isCompleted && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowDayPicker(true)}
          >
            Change day
          </button>
        )}
      </div>

      {/* Exercise list — planned exercises are sortable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={exercises.map((e) => e.exercise.id)}
          strategy={verticalListSortingStrategy}
        >
          {exercises.map((ex) => (
            <SortableExerciseCard
              key={ex.id}
              exercise={ex}
              currentSets={setsByExercise[ex.exercise.id] ?? []}
              workoutId={workoutId}
              readonly={readonly || isCompleted}
              isDraggable={!readonly && !isCompleted && !!workoutId}
            />
          ))}
        </SortableContext>
      </DndContext>
      {adHocExercises.map((ex) => (
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

      {/* Workout notes */}
      {workoutId && (
        <>
          <Separator className="opacity-20" />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Session notes</p>
            <Textarea
              placeholder="Overall session notes — energy, sleep, anything notable…"
              value={workoutNotes}
              onChange={(e) => handleWorkoutNotesChange(e.target.value)}
              disabled={readonly}
              className="text-sm min-h-[72px] resize-none"
            />
          </div>
        </>
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

interface SortableExerciseCardProps {
  exercise: WorkoutDayExercise
  currentSets: WorkoutSet[]
  workoutId: string | null
  readonly: boolean
  isDraggable: boolean
}

function SortableExerciseCard({
  exercise,
  currentSets,
  workoutId,
  readonly,
  isDraggable,
}: SortableExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.exercise.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : undefined,
  }

  const dragHandle = isDraggable ? (
    <button
      type="button"
      className="touch-none shrink-0 flex items-center justify-center w-6 h-8 text-muted-foreground/40 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
        <circle cx="2" cy="3" r="1.5" />
        <circle cx="8" cy="3" r="1.5" />
        <circle cx="2" cy="8" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="2" cy="13" r="1.5" />
        <circle cx="8" cy="13" r="1.5" />
      </svg>
    </button>
  ) : undefined

  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseCard
        exercise={exercise}
        currentSets={currentSets}
        workoutId={workoutId}
        readonly={readonly}
        dragHandle={dragHandle}
      />
    </div>
  )
}
