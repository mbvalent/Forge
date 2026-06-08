import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWorkoutSummaryForDate } from '@/lib/workout/queries'

interface WorkoutSummaryCardProps {
  date: string
}

export async function WorkoutSummaryCard({ date }: WorkoutSummaryCardProps) {
  const summary = await getWorkoutSummaryForDate(date)

  if (!summary) return null

  const isComplete = !!summary.completed_at
  const label = summary.workout_day_label ?? 'Workout'

  return (
    <Link href="/workout" className="block">
      <Card size="sm" className="hover:bg-muted/10 transition-colors">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{label}</p>
            {summary.top_lift && (
              <p className="text-xs text-muted-foreground truncate">{summary.top_lift}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              {summary.set_count} sets
            </span>
            {isComplete ? (
              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                Done
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
