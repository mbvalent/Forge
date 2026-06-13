'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface RestTimerProps {
  endTime: number
  onDismiss: () => void
}

const STORAGE_KEY = (date: string) => `forge_rest_timer_${date}`

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function RestTimer({ endTime, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endTime - Date.now()))
  const cancelRef = useRef(false)
  const rafRef = useRef<number>(0)
  // Tracks the effective end time — adjustable independently of the prop
  const endTimeRef = useRef(endTime)

  // Sync ref when a new timer starts (prop changes)
  useEffect(() => {
    endTimeRef.current = endTime
  }, [endTime])

  function dismiss() {
    localStorage.removeItem(STORAGE_KEY(getTodayStr()))
    onDismiss()
  }

  function adjustTime(deltaMs: number) {
    endTimeRef.current = endTimeRef.current + deltaMs
    localStorage.setItem(STORAGE_KEY(getTodayStr()), JSON.stringify({ endTime: endTimeRef.current }))
    setRemaining(Math.max(0, endTimeRef.current - Date.now()))
  }

  useEffect(() => {
    cancelRef.current = false

    const tick = () => {
      if (cancelRef.current) return
      const left = endTimeRef.current - Date.now()
      if (left <= 0) {
        setRemaining(0)
        localStorage.removeItem(STORAGE_KEY(getTodayStr()))
        onDismiss()
        return
      }
      setRemaining(left)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelRef.current = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [endTime, onDismiss])

  // Resync after screen lock / tab switch
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        cancelAnimationFrame(rafRef.current)
        cancelRef.current = false
        const tick = () => {
          if (cancelRef.current) return
          const left = endTimeRef.current - Date.now()
          if (left <= 0) {
            setRemaining(0)
            localStorage.removeItem(STORAGE_KEY(getTodayStr()))
            onDismiss()
            return
          }
          setRemaining(left)
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [endTime, onDismiss])

  const totalMs = endTime - (endTime - remaining) // same as remaining at start
  const seconds = Math.ceil(remaining / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  // Progress: 0 = done, 1 = full
  const initialMs = useRef(remaining)
  const progress = initialMs.current > 0 ? remaining / initialMs.current : 0

  const isUrgent = seconds <= 10
  const isVeryUrgent = seconds <= 5

  // Circular arc params
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const arcColor = isVeryUrgent
    ? 'var(--destructive)'
    : isUrgent
      ? 'oklch(0.75 0.15 85)'
      : 'var(--primary)'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss() }}>
      <DialogContent
        className="flex flex-col items-center justify-center gap-8 h-dvh max-w-full w-full rounded-none border-0 p-8"
        style={{ padding: 'max(2rem, env(safe-area-inset-top)) 2rem max(2rem, env(safe-area-inset-bottom)) 2rem' }}
      >
        <DialogTitle className="sr-only">Rest Timer</DialogTitle>

        <p className="text-sm text-muted-foreground uppercase tracking-widest">Rest</p>

        {/* Circular progress arc */}
        <div className="relative flex items-center justify-center">
          <svg width={200} height={200} className="-rotate-90">
            <circle
              cx={100}
              cy={100}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={8}
              className="text-border/30"
            />
            <circle
              cx={100}
              cy={100}
              r={radius}
              fill="none"
              stroke={arcColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.5s' }}
            />
          </svg>
          <span
            className={`absolute font-heading text-5xl font-bold tabular-nums transition-colors ${isVeryUrgent ? 'text-destructive' : isUrgent ? 'text-yellow-500' : 'text-foreground'}`}
          >
            {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}`}
          </span>
        </div>

        {/* +15 / -15 adjust buttons */}
        <div className="flex items-center gap-6">
          <Button
            variant="outline"
            className="min-h-[56px] min-w-[80px] text-sm"
            onClick={() => adjustTime(-15000)}
          >
            −15s
          </Button>
          <Button
            variant="outline"
            className="min-h-[56px] min-w-[80px] text-sm"
            onClick={() => adjustTime(15000)}
          >
            +15s
          </Button>
        </div>

        <Button variant="ghost" className="text-muted-foreground" onClick={dismiss}>
          Skip
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export function persistTimer(endTime: number) {
  localStorage.setItem(STORAGE_KEY(getTodayStr()), JSON.stringify({ endTime }))
}

export function readPersistedTimer(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(getTodayStr()))
    if (!raw) return null
    const { endTime } = JSON.parse(raw) as { endTime: number }
    return endTime > Date.now() ? endTime : null
  } catch {
    return null
  }
}
