'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'Workouts',
    match: (p: string) => p === '/' || p.startsWith('/workout'),
    icon: (
      // Barbell icon
      <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="1"  y="9"  width="3" height="6" rx="1.5" />
        <rect x="4"  y="10" width="2" height="4" rx="0.5" />
        <rect x="6"  y="11" width="12" height="2" rx="0.5" />
        <rect x="18" y="10" width="2" height="4" rx="0.5" />
        <rect x="21" y="9"  width="3" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'History',
    match: (p: string) => p.startsWith('/history'),
    icon: (
      // Trending-up chart icon
      <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 8 11 13 14 21 6" />
        <line x1="3" y1="21" x2="21" y2="21" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-fall-wheat bg-fall-cream"
    >
      <ul role="list" className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 py-2',
                  'text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-fall-rust',
                  active ? 'text-fall-rust' : 'text-fall-bark-light hover:text-fall-bark',
                ].join(' ')}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
