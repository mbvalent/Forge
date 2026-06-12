import { InsightPanel } from '@/components/chat/insight-panel'

interface InsightButtonsProps {
  date: string
}

export function InsightButtons({ date }: InsightButtonsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        AI Coach
      </p>
      <InsightPanel date={date} />
    </div>
  )
}
