'use client'

import { startTransition, useState, useTransition } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { createOrResumeWorkout } from '@/lib/actions/workout'
import type { WorkoutDay } from '@/lib/workout/types'
import { toast } from 'sonner'

// Weekday (0=Sun) → day_number for suggested day
const WEEKDAY_TO_DAY: Record<number, number> = {
  1: 1, // Mon → Day 1
  2: 2, // Tue → Day 2
  3: 3, // Wed → Day 3
  5: 4, // Fri → Day 4
  6: 5, // Sat → Day 5
}

interface DayPickerProps {
  date: string
  workoutDays: WorkoutDay[]
  onWorkoutReady: (workoutId: string, workoutDayId: string) => void
}

export function DayPicker({ date, workoutDays, onWorkoutReady }: DayPickerProps) {
  const [isPending, startPendingTransition] = useTransition()
  const [selected, setSelected] = useState<string | null>(null)

  const todayWeekday = new Date().getDay()
  const suggestedDayNumber = WEEKDAY_TO_DAY[todayWeekday] ?? null

  async function handleSelect(dayId: string) {
    setSelected(dayId)
    startPendingTransition(async () => {
      const result = await createOrResumeWorkout(date, dayId)
      if (result.success && result.data) {
        onWorkoutReady(result.data.workoutId, dayId)
      } else {
        toast.error('Failed to start workout — try again')
        setSelected(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Choose today's workout</p>
      <ToggleGroup
        value={selected ? [selected] : []}
        onValueChange={(vals) => { const val = vals[vals.length - 1]; if (val) handleSelect(val) }}
        className="flex flex-col gap-2"
        disabled={isPending}
      >
        {workoutDays.map((day) => {
          const isSuggested = day.day_number === suggestedDayNumber
          return (
            <ToggleGroupItem
              key={day.id}
              value={day.id}
              className="relative w-full min-h-[56px] justify-start px-4 text-left"
            >
              <span className="font-medium">Day {day.day_number}</span>
              <span className="ml-2 text-muted-foreground text-sm">{day.label}</span>
              {isSuggested && (
                <span className="ml-auto text-xs text-primary">Today's plan</span>
              )}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
