'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sun01Icon, Moon01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn('min-h-[44px]', showLabel ? 'justify-start gap-3 px-3' : 'size-11', className)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <HugeiconsIcon icon={isDark ? Sun01Icon : Moon01Icon} size={20} strokeWidth={1.5} />
      {showLabel && <span className="text-sm font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </Button>
  )
}
