import { format } from 'date-fns'
import { DietView } from '@/components/diet/diet-view'
import { WorkoutSummaryCard } from '@/components/workout/workout-summary-card'

export default async function TodayPage() {
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <WorkoutSummaryCard date={today} />

      <DietView date={today} />
    </div>
  )
}
