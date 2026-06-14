import { HugeiconsIcon } from '@hugeicons/react'
import { FlashIcon } from '@hugeicons/core-free-icons'
import { InsightPanel } from '@/components/chat/insight-panel'

interface AICoachCardProps {
  date: string
}

export function AICoachCard({ date }: AICoachCardProps) {
  return (
    <div
      className="rounded-2xl p-5 ring-1 ring-primary/24"
      style={{
        background:
          'linear-gradient(120deg, color-mix(in oklch, var(--primary) 13%, var(--card)), var(--card) 70%)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <HugeiconsIcon icon={FlashIcon} size={15} strokeWidth={2} className="text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">
          AI Coach
        </p>
      </div>
      <InsightPanel date={date} />
    </div>
  )
}
