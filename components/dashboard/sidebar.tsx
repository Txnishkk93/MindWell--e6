'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MessageSquare, TrendingUp, FileText, Lightbulb, Settings } from 'lucide-react'

const navigationItems = [
  {
    label: 'Chat',
    href: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    label: 'Mood Tracker',
    href: '/dashboard/mood',
    icon: TrendingUp,
  },
  {
    label: 'Burnout Survey',
    href: '/dashboard/survey',
    icon: Lightbulb,
  },
  {
    label: 'Journal',
    href: '/dashboard/journal',
    icon: FileText,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-mindwell-cream border-r border-gray-200 p-6 flex flex-col">
      <Link href="/dashboard" className="mb-8">
        <h1 className="text-2xl font-bold text-mindwell-primary-green">MindWell</h1>
      </Link>

      <nav className="space-y-2 flex-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-mindwell-primary-green text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Taking care of your mental health, one step at a time
        </p>
      </div>
    </aside>
  )
}
