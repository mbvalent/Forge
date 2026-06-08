import { format } from 'date-fns'
import { DietView } from '@/components/diet/diet-view'

export default async function TodayPage() {
  // Use today's date in the server's local time
  // Note: client passes their local date for mutations (D4); server uses it for initial render
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <DietView date={today} />
    </div>
  )
}
