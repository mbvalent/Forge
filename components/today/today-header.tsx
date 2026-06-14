import { HugeiconsIcon } from '@hugeicons/react'
import { Fire03Icon } from '@hugeicons/core-free-icons'
import { format, parseISO } from 'date-fns'

interface TodayHeaderProps {
  date: string
  isTrainingDay: boolean
  streak: number
}

export function TodayHeader({ date, isTrainingDay, streak }: TodayHeaderProps) {
  const parsed = parseISO(date)
  const dayName = format(parsed, 'EEEE')
  const dateFmt = format(parsed, 'MMMM d')

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-heading text-3xl font-bold leading-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dayName}, {dateFmt} · {isTrainingDay ? 'Training day' : 'Rest day'}
        </p>
      </div>
      {streak > 0 && (
        <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3.5 py-2 text-sm font-semibold text-primary ring-1 ring-primary/25">
          <HugeiconsIcon icon={Fire03Icon} size={15} strokeWidth={2} />
          {streak}-day streak
        </div>
      )}
    </div>
  )
}
