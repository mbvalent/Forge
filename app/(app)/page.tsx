import { format } from 'date-fns'
import { DietView } from '@/components/diet/diet-view'
import { WorkoutSummaryCard } from '@/components/workout/workout-summary-card'
import { TodayRedirect } from './today-redirect'

interface TodayPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const { date: dateParam } = await searchParams
  const serverToday = format(new Date(), 'yyyy-MM-dd')
  const date = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) ? dateParam : serverToday

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <TodayRedirect serverDate={serverToday} />
      <div>
        <h1 className="font-heading text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(date), 'EEEE, MMMM d')}</p>
      </div>

      <WorkoutSummaryCard date={date} />

      <DietView date={date} />
    </div>
  )
}
