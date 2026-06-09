'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export function TodayRedirect({ serverDate }: { serverDate: string }) {
  const router = useRouter()
  useEffect(() => {
    const clientToday = format(new Date(), 'yyyy-MM-dd')
    if (serverDate !== clientToday) {
      router.replace(`/?date=${clientToday}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
