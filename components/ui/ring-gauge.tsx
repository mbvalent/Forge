import { cn } from "@/lib/utils"

interface RingGaugeProps {
  size: number
  stroke: number
  pct: number
  color: string
  track?: string
  children?: React.ReactNode
  className?: string
}

export function RingGauge({
  size,
  stroke,
  pct,
  color,
  track = "color-mix(in oklch, var(--foreground) 11%, transparent)",
  children,
  className,
}: RingGaugeProps) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.2,.7,.3,1)" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
