'use client'

import { type ReactNode, startTransition, useOptimistic, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { SetRow } from './set-row'
import { ExerciseFormModal } from './exercise-form-modal'
import { logSet, deleteSet, updateSet, updateExerciseNote, upsertWorkoutExerciseNote } from '@/lib/actions/workout'
import { persistTimer } from './rest-timer'
import { useWorkoutTimer } from '@/app/(app)/workout/layout'
import { displayExerciseName } from '@/lib/workout/exercise-tips'
import type { WorkoutDayExercise, WorkoutSet, SetSavedPayload } from '@/lib/workout/types'
import { cn } from '@/lib/utils'

type SetAction =
  | { type: 'add'; set: WorkoutSet }
  | { type: 'delete'; id: string }
  | { type: 'update'; id: string; weight_kg: number; reps: number; rir: number | null }

interface ExerciseCardProps {
  exercise: WorkoutDayExercise
  currentSets: WorkoutSet[]
  workoutId: string | null
  readonly?: boolean
  onSetSaved?: (payload: SetSavedPayload) => void
  dragHandle?: ReactNode
}

export function ExerciseCard({
  exercise,
  currentSets: serverSets,
  workoutId,
  readonly = false,
  onSetSaved,
  dragHandle,
}: ExerciseCardProps) {
  const router = useRouter()
  const { startTimer } = useWorkoutTimer()

  const [optimisticSets, dispatchOptimistic] = useOptimistic<WorkoutSet[], SetAction>(
    serverSets,
    (state, action) => {
      switch (action.type) {
        case 'add':
          return [...state, action.set]
        case 'delete':
          return state.filter((s) => s.id !== action.id)
        case 'update':
          return state.map((s) =>
            s.id === action.id
              ? { ...s, weight_kg: action.weight_kg, reps: action.reps, rir: action.rir }
              : s
          )
      }
    }
  )

  const [isOpen, setIsOpen] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null)
  const [showTips, setShowTips] = useState(false)

  // Notes state
  const [persistentNote, setPersistentNote] = useState(exercise.exercise.notes ?? '')
  const [sessionNote, setSessionNote] = useState(exercise.session_note ?? '')
  const persistentNoteDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sessionNoteDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function handlePersistentNoteChange(value: string) {
    setPersistentNote(value)
    clearTimeout(persistentNoteDebounce.current)
    persistentNoteDebounce.current = setTimeout(() => {
      updateExerciseNote(exercise.exercise.id, value)
    }, 1000)
  }

  function handleSessionNoteChange(value: string) {
    setSessionNote(value)
    if (!workoutId) return
    clearTimeout(sessionNoteDebounce.current)
    sessionNoteDebounce.current = setTimeout(() => {
      upsertWorkoutExerciseNote(workoutId!, exercise.exercise.id, value)
    }, 1000)
  }

  // Add set input state — pre-fill from last set in this workout, or last session
  const lastCurrentSet = optimisticSets[optimisticSets.length - 1]
  const lastSessionFirst = exercise.last_session?.sets[0]
  const prefillWeight = lastCurrentSet?.weight_kg ?? lastSessionFirst?.weight_kg ?? 0
  const prefillReps = lastCurrentSet?.reps ?? lastSessionFirst?.reps ?? 10

  const [inputWeight, setInputWeight] = useState(prefillWeight)
  const [inputReps, setInputReps] = useState(prefillReps)
  const [inputRir, setInputRir] = useState<number | null>(2)

  const exerciseSets = optimisticSets.filter((s) => s.exercise_id === exercise.exercise.id)

  function openAddRow() {
    setInputWeight(lastCurrentSet?.weight_kg ?? lastSessionFirst?.weight_kg ?? 0)
    setInputReps(lastCurrentSet?.reps ?? lastSessionFirst?.reps ?? 10)
    setInputRir(2)
    setShowAddRow(true)
    setEditingSet(null)
  }

  async function handleSaveSet(weightKg: number, reps: number, rir: number | null) {
    if (!workoutId) return
    const setNumber = exerciseSets.length + 1
    const tempId = `optimistic-${Date.now()}`

    const tempSet: WorkoutSet = {
      id: tempId,
      exercise_id: exercise.exercise.id,
      set_number: setNumber,
      weight_kg: weightKg,
      reps,
      rir,
    }

    setShowAddRow(false)

    startTransition(async () => {
      dispatchOptimistic({ type: 'add', set: tempSet })
      const result = await logSet(workoutId, exercise.exercise.id, setNumber, weightKg, reps, rir)
      if (!result.success) {
        toast.error('Failed to log set — try again')
      } else {
        // Fire rest timer
        const restSec = exercise.exercise.default_rest_sec ?? 90
        const endTime = Date.now() + restSec * 1000
        persistTimer(endTime)
        startTimer({ endTime })
        router.refresh()
      }
    })
  }

  async function handleDelete(id: string) {
    setEditingSet(null)
    startTransition(async () => {
      dispatchOptimistic({ type: 'delete', id })
      const result = await deleteSet(id)
      if (!result.success) {
        toast.error('Failed to delete — try again')
      } else {
        router.refresh()
      }
    })
  }

  async function handleUpdate(set: WorkoutSet, weightKg: number, reps: number, rir: number | null) {
    setEditingSet(null)
    startTransition(async () => {
      dispatchOptimistic({ type: 'update', id: set.id, weight_kg: weightKg, reps, rir })
      const result = await updateSet(set.id, weightKg, reps, rir)
      if (!result.success) {
        toast.error('Failed to update — try again')
      } else {
        router.refresh()
      }
    })
  }

  const hasLastSession = exercise.last_session && exercise.last_session.sets.length > 0

  return (
    <>
      <ExerciseFormModal
        exerciseName={exercise.exercise.name}
        open={showTips}
        onOpenChange={setShowTips}
      />
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card size="sm" className="overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-3">
            <div className="flex w-full items-center gap-2 min-h-[44px]">
              {dragHandle}
              <CollapsibleTrigger className="flex flex-1 items-center justify-between text-left gap-2">
                <CardTitle className="text-sm">{displayExerciseName(exercise.exercise.name)}</CardTitle>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {exerciseSets.length}/{exercise.target_sets} sets
                  {exercise.target_rir_label && ` · RIR ${exercise.target_rir_label}`}
                </span>
              </CollapsibleTrigger>
              <button
                type="button"
                aria-label="Form tips"
                className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-bold italic text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                onClick={() => setShowTips(true)}
              >
                i
              </button>
            </div>
          </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-0 pt-1 pb-2">
            {/* Last session reference */}
            {hasLastSession && (
              <p className="text-xs text-muted-foreground py-1.5 border-b border-border/10">
                Last ({format(parseISO(exercise.last_session!.date), 'EEE MMM d')}):{' '}
                {exercise.last_session!.sets
                  .map((s) => `${s.weight_kg}×${s.reps}${s.rir !== null ? ` RIR${s.rir}` : ''}`)
                  .join(' · ')}
              </p>
            )}

            {/* Logged sets */}
            {exerciseSets.map((set, i) => (
              <div key={set.id}>
                {i > 0 && <Separator className="opacity-20" />}
                {editingSet?.id === set.id ? (
                  <SetEditRow
                    set={set}
                    onSave={(w, r, rir) => handleUpdate(set, w, r, rir)}
                    onCancel={() => setEditingSet(null)}
                  />
                ) : (
                  <SetRow
                    set={set}
                    index={i}
                    readonly={readonly}
                    onDelete={handleDelete}
                    onEdit={setEditingSet}
                  />
                )}
              </div>
            ))}

            {/* Add set row */}
            {!readonly && (
              <div className={cn('pt-1', exerciseSets.length > 0 && 'mt-1 border-t border-border/20')}>
                {showAddRow ? (
                  <SetInputRow
                    weight={inputWeight}
                    reps={inputReps}
                    rir={inputRir}
                    onWeightChange={setInputWeight}
                    onRepsChange={setInputReps}
                    onRirChange={setInputRir}
                    onSave={() => handleSaveSet(inputWeight, inputReps, inputRir)}
                    onSamAsLast={
                      hasLastSession
                        ? () => {
                            const first = exercise.last_session?.sets[0]
                            if (first) handleSaveSet(first.weight_kg, first.reps, first.rir)
                          }
                        : undefined
                    }
                    onCancel={() => setShowAddRow(false)}
                    disabled={!workoutId}
                  />
                ) : (
                  <button
                    className="flex w-full items-center gap-2 py-2 text-sm text-primary hover:text-primary/80 min-h-[44px]"
                    onClick={openAddRow}
                    disabled={!workoutId}
                  >
                    <span className="text-base leading-none">+</span>
                    <span>Add set</span>
                  </button>
                )}
              </div>
            )}
            {/* Notes section */}
            <div className="mt-2 pt-2 border-t border-border/10 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Today's note</p>
                <Textarea
                  placeholder="How did this feel? Any adjustments…"
                  value={sessionNote}
                  onChange={(e) => handleSessionNoteChange(e.target.value)}
                  disabled={!workoutId || readonly}
                  className="text-xs min-h-[60px] resize-none bg-muted/20"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Reminder <span className="text-muted-foreground/50">(saved permanently)</span></p>
                <Textarea
                  placeholder="Cue to remember every session…"
                  value={persistentNote}
                  onChange={(e) => handlePersistentNoteChange(e.target.value)}
                  disabled={readonly}
                  className="text-xs min-h-[60px] resize-none bg-muted/20"
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
    </>
  )
}

// --- Sub-components ---

interface SetInputRowProps {
  weight: number
  reps: number
  rir: number | null
  onWeightChange: (v: number) => void
  onRepsChange: (v: number) => void
  onRirChange: (v: number | null) => void
  onSave: () => void
  onSamAsLast?: () => void
  onCancel: () => void
  disabled?: boolean
}

function SetInputRow({
  weight,
  reps,
  rir,
  onWeightChange,
  onRepsChange,
  onRirChange,
  onSave,
  onSamAsLast,
  onCancel,
  disabled,
}: SetInputRowProps) {
  return (
    <div className="py-2 space-y-3">
      {/* Weight row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => onWeightChange(Math.max(0, +(weight - 2.5).toFixed(1)))}
        >
          −
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground mb-1">kg</p>
          <Input
            type="text"
            inputMode="decimal"
            value={weight || ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) onWeightChange(v)
            }}
            className="text-center tabular-nums h-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => onWeightChange(+(weight + 2.5).toFixed(1))}
        >
          +
        </Button>
      </div>

      {/* Reps row */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => onRepsChange(Math.max(1, reps - 1))}
        >
          −
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground mb-1">reps</p>
          <Input
            type="text"
            inputMode="numeric"
            value={reps || ''}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (!isNaN(v) && v > 0) onRepsChange(v)
            }}
            className="text-center tabular-nums h-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => onRepsChange(reps + 1)}
        >
          +
        </Button>
      </div>

      {/* RIR pill row */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">RIR (optional)</p>
        <ToggleGroup
          value={rir !== null ? [String(rir)] : []}
          onValueChange={(vals) => onRirChange(vals.length ? Number(vals[vals.length - 1]) : null)}
          className="grid grid-cols-5 gap-1"
        >
          {[0, 1, 2, 3, 4].map((n) => (
            <ToggleGroupItem
              key={n}
              value={String(n)}
              className="min-h-[44px] text-sm font-medium"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {onSamAsLast && (
          <Button
            variant="outline"
            className="flex-1 min-h-[44px] text-sm"
            onClick={onSamAsLast}
            disabled={disabled}
          >
            Same as last
          </Button>
        )}
        <Button
          className="flex-1 min-h-[44px]"
          onClick={onSave}
          disabled={disabled || !weight || !reps}
        >
          Log set
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="min-h-[44px]">
          ✕
        </Button>
      </div>
    </div>
  )
}

interface SetEditRowProps {
  set: WorkoutSet
  onSave: (weight: number, reps: number, rir: number | null) => void
  onCancel: () => void
}

function SetEditRow({ set, onSave, onCancel }: SetEditRowProps) {
  const [weight, setWeight] = useState(set.weight_kg)
  const [reps, setReps] = useState(set.reps)
  const [rir, setRir] = useState<number | null>(set.rir)

  return (
    <div className="py-2 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => setWeight((w) => Math.max(0, +(w - 2.5).toFixed(1)))}
        >
          −
        </Button>
        <Input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) setWeight(v)
          }}
          className="text-center tabular-nums flex-1 h-10"
        />
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => setWeight((w) => +(w + 2.5).toFixed(1))}
        >
          +
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => setReps((r) => Math.max(1, r - 1))}
        >
          −
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={reps}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v > 0) setReps(v)
          }}
          className="text-center tabular-nums flex-1 h-10"
        />
        <Button
          variant="outline"
          size="icon"
          className="min-h-[56px] min-w-[56px] shrink-0"
          onClick={() => setReps((r) => r + 1)}
        >
          +
        </Button>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 min-h-[44px]" onClick={() => onSave(weight, reps, rir)}>
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel} className="min-h-[44px]">
          Cancel
        </Button>
      </div>
    </div>
  )
}
