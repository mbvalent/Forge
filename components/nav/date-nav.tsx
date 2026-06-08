'use client'

import { useRouter } from 'next/navigation'
import { addDays, format, subDays, isToday, parseISO, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/button'

interface DateNavProps {
  date: string
  todayStr: string
  basePath: string
}

export function DateNav({ date, todayStr, basePath }: DateNavProps) {
  const router = useRouter()
  const parsed = parseISO(date)
  const todayParsed = parseISO(todayStr)

  const isCurrentDay = isToday(parsed)
  const daysFromToday = differenceInDays(todayParsed, parsed)
  const atLowerBound = daysFromToday >= 90

  function navigate(newDate: Date) {
    const str = format(newDate, 'yyyy-MM-dd')
    router.push(`${basePath}?date=${str}`)
  }

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(subDays(parsed, 1))}
        disabled={atLowerBound}
        aria-label="Previous day"
        className="min-h-[44px] min-w-[44px]"
      >
        ‹
      </Button>

      <div className="text-center">
        <p className="text-sm font-medium">
          {isCurrentDay ? 'Today' : format(parsed, 'EEE, MMM d')}
        </p>
        {!isCurrentDay && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => navigate(todayParsed)}
          >
            Back to today
          </button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(addDays(parsed, 1))}
        disabled={isCurrentDay}
        aria-label="Next day"
        className="min-h-[44px] min-w-[44px]"
      >
        ›
      </Button>
    </div>
  )
}
