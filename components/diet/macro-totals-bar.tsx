'use client'

import { ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Progress } from '@base-ui/react/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
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
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {isTrainingDay ? 'Training day' : 'Rest day'}
          </span>
          {!isTrainingDay && (
            <Popover>
              <PopoverTrigger className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={1.5} className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent side="left" align="center" className="w-56 text-xs text-muted-foreground">
                No sets logged today. Log a workout to switch to training day targets (1950 kcal).
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <MacroRow label="Calories" actual={totals.calories} target={targets.calories} unit=" kcal" />
      <MacroRow label="Protein" actual={totals.protein} target={targets.protein} unit="g" />
      <MacroRow label="Carbs" actual={totals.carbs} target={targets.carbs} unit="g" />
      <MacroRow label="Fat" actual={totals.fat} target={targets.fat} unit="g" />
    </div>
  )
}
