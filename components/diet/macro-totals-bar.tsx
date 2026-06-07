'use client'

import { ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Progress } from '@base-ui/react/progress'
import { cn } from '@/lib/utils'
import type { MacroTargets } from '@/lib/diet/targets'
import type { MacroTotals } from '@/lib/diet/types'

interface MacroTotalsBarProps {
  totals: MacroTotals
  targets: MacroTargets
  isTrainingDay: boolean
}

interface MacroRowProps {
  label: string
  actual: number
  target: number
  unit: string
}

function MacroRow({ label, actual, target, unit }: MacroRowProps) {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0
  const over = actual > target

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">{label}</span>
        <span className={cn('text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>
          {Math.round(actual)}<span className="opacity-60">/{target}{unit}</span>
        </span>
      </div>
      <Progress.Root value={pct} className="flex flex-col">
        <ProgressTrack className="h-2">
          <ProgressIndicator
            className={cn('h-full transition-all duration-500', over ? 'bg-destructive' : 'bg-primary')}
          />
        </ProgressTrack>
      </Progress.Root>
    </div>
  )
}

export function MacroTotalsBar({ totals, targets, isTrainingDay }: MacroTotalsBarProps) {
  return (
    <div className="space-y-3 rounded-2xl bg-card/60 p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Today&apos;s Nutrition</p>
        <span className="text-xs text-muted-foreground">
          {isTrainingDay ? 'Training day' : 'Rest day'}
        </span>
      </div>
      <MacroRow label="Calories" actual={totals.calories} target={targets.calories} unit=" kcal" />
      <MacroRow label="Protein" actual={totals.protein} target={targets.protein} unit="g" />
      <MacroRow label="Carbs" actual={totals.carbs} target={targets.carbs} unit="g" />
      <MacroRow label="Fat" actual={totals.fat} target={targets.fat} unit="g" />
    </div>
  )
}
