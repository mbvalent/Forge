import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Sparkline } from '@/components/ui/sparkline'
import type { LatestWeightLog } from '@/lib/weight/queries'

interface WeightTileProps {
  log: LatestWeightLog | null
}

export function WeightTile({ log }: WeightTileProps) {
  if (!log) {
    return (
      <Link href="/more" className="block flex-1">
        <Card className="flex h-full flex-col items-center justify-center gap-1.5 border border-dashed border-foreground/20 bg-transparent px-5 py-4 text-muted-foreground shadow-none transition-colors hover:bg-muted/5">
          <span className="text-sm">+ Log weight</span>
        </Card>
      </Link>
    )
  }

  const deltaIsDown = log.delta_wk !== null && log.delta_wk <= 0

  return (
    <Link href="/more" className="block flex-1">
      <Card className="flex h-full flex-col justify-between px-5 py-4 transition-colors hover:bg-muted/5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">
            Weight
          </p>
          {log.delta_wk !== null && (
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: deltaIsDown ? 'var(--success)' : 'var(--destructive)' }}
            >
              {deltaIsDown ? '▼' : '▲'} {Math.abs(log.delta_wk).toFixed(1)} kg / wk
            </span>
          )}
        </div>
        <div className="flex items-end justify-between mt-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-[28px] font-bold tabular-nums leading-none">
              {log.weight_kg.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
          {log.series.length > 1 && (
            <Sparkline data={log.series} w={120} h={36} />
          )}
        </div>
      </Card>
    </Link>
  )
}
