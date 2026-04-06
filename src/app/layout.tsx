import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'

export const metadata: Metadata = {
  title: '531 Tracker',
  description: '5/3/1 workout tracker',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fall-cream text-fall-bark antialiased">
        <main className="mx-auto max-w-md px-4 pt-6 pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
