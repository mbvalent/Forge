import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { RingGauge } from '@/components/ui/ring-gauge'
import type { MacroTotals } from '@/lib/diet/types'
import type { MacroTargets } from '@/lib/diet/targets'

interface MacroMini {
  label: string
  value: number
  target: number
  color: string
}

interface NutritionCardProps {
  totals: MacroTotals
  targets: MacroTargets
}

export function NutritionCard({ totals, targets }: NutritionCardProps) {
  const kcalLeft = Math.max(0, targets.calories - totals.calories)
  const kcalPct = Math.min(100, (totals.calories / targets.calories) * 100)

  const macros: MacroMini[] = [
    { label: 'Protein', value: Math.round(totals.protein), target: targets.protein, color: 'var(--primary)' },
    { label: 'Carbs', value: Math.round(totals.carbs), target: targets.carbs, color: 'var(--chart-2)' },
    { label: 'Fat', value: Math.round(totals.fat), target: targets.fat, color: 'var(--chart-4)' },
  ]

  return (
    <Link href="/diet" className="block h-full">
      <Card className="flex h-full items-center gap-6 px-6 py-5 transition-colors hover:bg-muted/5">
        <RingGauge size={150} stroke={13} pct={kcalPct} color="var(--primary)">
          <span className="font-heading text-4xl font-bold tabular-nums leading-none">
            {kcalLeft.toLocaleString()}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            kcal left
          </span>
        </RingGauge>

        <div className="flex flex-1 justify-around">
          {macros.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-2">
              <RingGauge
                size={70}
                stroke={7}
                pct={(m.value / m.target) * 100}
                color={m.color}
              >
                <span className="font-heading text-[17px] font-bold tabular-nums leading-none">
                  {m.value}
                </span>
                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                  /{m.target}
                </span>
              </RingGauge>
              <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </Link>
  )
}
