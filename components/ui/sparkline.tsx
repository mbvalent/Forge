interface SparklineProps {
  data: number[]
  w?: number
  h?: number
  color?: string
}

export function Sparkline({
  data,
  w = 150,
  h = 42,
  color = "var(--chart-2)",
}: SparklineProps) {
  if (!data || data.length === 0) return null

  if (data.length === 1) {
    return (
      <svg width={w} height={h} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
        <circle cx={w / 2} cy={h / 2} r={3.5} fill="var(--primary)" />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 4

  const pts: [number, number][] = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - pad * 2) - pad,
  ])

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ")

  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`

  const last = pts[pts.length - 1]!

  return (
    <svg width={w} height={h} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <path
        d={areaPath}
        fill="color-mix(in oklch, var(--chart-2) 13%, transparent)"
        stroke="none"
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--primary)" />
    </svg>
  )
}
