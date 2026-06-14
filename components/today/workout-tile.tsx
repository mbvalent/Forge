import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { HugeiconsIcon } from '@hugeicons/react'
import { Dumbbell01Icon, Bedug02Icon } from '@hugeicons/core-free-icons'
import type { WorkoutSummary } from '@/lib/workout/types'

interface WorkoutTileProps {
  summary: WorkoutSummary | null
  isTrainingDay: boolean
}

export function WorkoutTile({ summary, isTrainingDay }: WorkoutTileProps) {
  if (!isTrainingDay) {
    return (
      <Card className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
        <HugeiconsIcon icon={Bedug02Icon} size={26} strokeWidth={1.5} />
        <span className="text-sm">Rest day · active recovery</span>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Link href="/workout" className="block flex-1">
        <Card className="flex h-full flex-col items-center justify-center gap-2 py-6 text-muted-foreground transition-colors hover:bg-muted/5">
          <HugeiconsIcon icon={Dumbbell01Icon} size={26} strokeWidth={1.5} />
          <span className="text-sm font-medium text-primary">Start today&apos;s workout →</span>
        </Card>
      </Link>
    )
  }

  const isComplete = !!summary.completed_at
  const label = summary.workout_day_label ?? 'Workout'

  return (
    <Link href="/workout" className="block flex-1">
      <Card className="flex h-full flex-col justify-between px-5 py-4 transition-colors hover:bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary/16 text-primary">
            <HugeiconsIcon icon={Dumbbell01Icon} size={19} strokeWidth={2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[.07em] text-primary">
            {isComplete ? 'Complete' : 'In progress'}
          </span>
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
            {summary.set_count} sets logged
            {summary.top_lift ? ` · ${summary.top_lift}` : ''}
          </p>
          <Progress
            value={isComplete ? 100 : 50}
            className="h-1.5"
          />
        </div>
      </Card>
    </Link>
  )
}
