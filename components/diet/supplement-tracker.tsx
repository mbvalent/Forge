'use client'

import { useOptimistic, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { toggleSupplement } from '@/lib/actions/diet'

const SUPPLEMENTS = [
  { key: 'fish-oil', label: 'Fish Oil' },
  { key: 'calcium', label: 'Calcium' },
  { key: 'ashwagandha', label: 'Ashwagandha' },
  { key: 'creatine', label: 'Creatine' },
] as const

interface SupplementTrackerProps {
  date: string
  taken: string[]
}

export function SupplementTracker({ date, taken }: SupplementTrackerProps) {
  const [optimisticTaken, setOptimisticTaken] = useOptimistic(taken)
  const [, startTransition] = useTransition()

  function toggle(key: string) {
    startTransition(async () => {
      setOptimisticTaken((prev) =>
        prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
      )
      await toggleSupplement(date, key)
    })
  }

  return (
    <div className="rounded-2xl bg-card/60 p-4 ring-1 ring-border space-y-3">
      <p className="text-sm font-medium text-foreground">Supplements</p>
      <div className="flex flex-wrap gap-2">
        {SUPPLEMENTS.map(({ key, label }) => {
          const active = optimisticTaken.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-medium transition-colors ring-1 min-h-[44px]',
                active
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-card text-muted-foreground ring-border hover:ring-primary/50 hover:text-foreground'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
