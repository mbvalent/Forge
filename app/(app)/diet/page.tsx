import { format, isToday, parseISO } from 'date-fns'
import { DietView } from '@/components/diet/diet-view'
import { DateNav } from './date-nav'

interface DietPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function DietPage({ searchParams }: DietPageProps) {
  const { date: dateParam } = await searchParams
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Validate and default to today
  let date = todayStr
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    date = dateParam
  }

  const isPast = !isToday(parseISO(date))

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold">Diet</h1>

      <DateNav date={date} todayStr={todayStr} basePath="/diet" />

      {isPast && (
        <p className="text-xs text-muted-foreground text-center">
          Viewing past date — read only
        </p>
      )}

      <DietView date={date} readonly={isPast} />
    </div>
  )
}
