'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addDays, format, parseISO, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/button'

interface DateNavProps {
  date: string
  basePath: string
}

export function DateNav({ date, basePath }: DateNavProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = format(new Date(), 'yyyy-MM-dd')

  const parsed = parseISO(date)
  const todayParsed = parseISO(today)

  const isCurrentDay = date === today
  const daysFromToday = differenceInDays(todayParsed, parsed)
  const atLowerBound = daysFromToday >= 90
  const isFuture = daysFromToday < 0

  // When no date param in URL, the server defaulted to UTC today which may differ
  // from the client's local today — redirect to the correct local date.
  useEffect(() => {
    if (!searchParams.get('date')) {
      router.replace(`${basePath}?date=${today}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function navigate(newDate: Date) {
    const str = format(newDate, 'yyyy-MM-dd')
    router.push(`${basePath}?date=${str}`)
  }

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(addDays(parsed, -1))}
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
        disabled={isCurrentDay || isFuture}
        aria-label="Next day"
        className="min-h-[44px] min-w-[44px]"
      >
        ›
      </Button>
    </div>
  )
}
