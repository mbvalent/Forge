import { format } from 'date-fns'
import { DietView } from '@/components/diet/diet-view'
import { DateNav } from './date-nav'

interface DietPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function DietPage({ searchParams }: DietPageProps) {
  const { date: dateParam } = await searchParams
  const serverToday = format(new Date(), 'yyyy-MM-dd')

  let date = serverToday
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    date = dateParam
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold">Diet</h1>

      <DateNav date={date} basePath="/diet" />

      <DietView date={date} />
    </div>
  )
}
