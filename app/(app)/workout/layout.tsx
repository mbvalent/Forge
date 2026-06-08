'use client'

import { useState, createContext, useContext } from 'react'
import { RestTimer } from '@/components/workout/rest-timer'

interface TimerPayload {
  endTime: number
}

interface WorkoutTimerContextValue {
  startTimer: (payload: TimerPayload) => void
}

const WorkoutTimerContext = createContext<WorkoutTimerContextValue>({
  startTimer: () => {},
})

export function useWorkoutTimer() {
  return useContext(WorkoutTimerContext)
}

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  const [timerPayload, setTimerPayload] = useState<TimerPayload | null>(null)

  return (
    <WorkoutTimerContext.Provider value={{ startTimer: setTimerPayload }}>
      {children}
      {timerPayload && (
        <RestTimer endTime={timerPayload.endTime} onDismiss={() => setTimerPayload(null)} />
      )}
    </WorkoutTimerContext.Provider>
  )
}
