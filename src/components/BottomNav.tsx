'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { saveEquipmentConfig } from '@/lib/equipment'
import type { EquipmentConfig } from '@/lib/types'

type SyncState = 'idle' | 'loading' | 'done'

export function BottomNav() {
  const pathname = usePathname() ?? '/'
  const [syncState, setSyncState] = useState<SyncState>('idle')

  const tabs = [
    {
      href: '/',
      label: 'Workouts',
      active: pathname === '/' || pathname.startsWith('/workout'),
      icon: (
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
      active: pathname.startsWith('/history'),
      icon: (
        <svg aria-hidden="true" focusable="false" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 17 8 11 13 14 21 6" />
          <line x1="3" y1="21" x2="21" y2="21" />
        </svg>
      ),
    },
  ]

  async function handleSyncEquipment() {
    if (syncState === 'loading') return
    setSyncState('loading')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/equipment`)
      if (res.ok) {
        const config: EquipmentConfig = await res.json()
        saveEquipmentConfig(config)
        setSyncState('done')
        setTimeout(() => setSyncState('idle'), 1500)
      } else {
        setSyncState('idle')
      }
    } catch {
      setSyncState('idle')
    }
  }

  return (
    <nav
      aria-label="Main navigation"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
      className="border-t border-fall-wheat bg-fall-cream"
    >
      <ul role="list" className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex-1">
            <Link
              href={tab.href}
              aria-current={tab.active ? 'page' : undefined}
              className={[
                'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 py-2',
                'text-xs font-medium transition-colors',
                tab.active ? 'text-fall-rust' : 'text-fall-bark-light hover:text-fall-bark',
              ].join(' ')}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          </li>
        ))}

        <li className="flex-1">
          <button
            type="button"
            onClick={handleSyncEquipment}
            aria-label="Sync equipment from Google Sheet"
            className="flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-fall-bark-light transition-colors hover:text-fall-bark"
          >
            {syncState === 'loading' ? (
              <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : syncState === 'done' ? (
              <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fall-olive">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            )}
            <span className={syncState === 'done' ? 'text-fall-olive' : ''}>
              {syncState === 'done' ? 'Synced ✓' : 'Equipment'}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
