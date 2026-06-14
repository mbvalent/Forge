'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon,
  Restaurant01Icon,
  Dumbbell01Icon,
  ChatBotIcon,
  More01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/actions/logout'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/nav/theme-toggle'

const tabs = [
  { href: '/', label: 'Today', icon: Home01Icon },
  { href: '/diet', label: 'Diet', icon: Restaurant01Icon },
  { href: '/workout', label: 'Workout', icon: Dumbbell01Icon },
  { href: '/chat', label: 'Chat', icon: ChatBotIcon },
  { href: '/more', label: 'More', icon: More01Icon },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex w-[236px] shrink-0 flex-col border-r border-foreground/8 bg-background/86 backdrop-blur-md pt-6',
        className,
      )}
    >
      <div className="px-4 pb-6 flex items-center">
        <Image src="/logo.png" alt="Forge Logo" width={200} height={200} className="h-auto w-auto object-contain" priority />
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {tabs.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-[13px] px-3.5 text-sm font-medium transition-colors min-h-[46px]',
                active
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <HugeiconsIcon
                icon={icon}
                size={21}
                strokeWidth={active ? 2 : 1.6}
              />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-2 pb-4 flex flex-col gap-1">
        <ThemeToggle showLabel className="w-full text-muted-foreground/60 hover:text-accent-foreground" />
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground/60 hover:text-accent-foreground min-h-[44px]"
          >
            <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.5} />
            Log out
          </Button>
        </form>
      </div>
    </aside>
  )
}
