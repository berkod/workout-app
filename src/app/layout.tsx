import type { Metadata, Viewport } from 'next'
import './globals.css'

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
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fall-cream text-fall-bark antialiased">
        <main className="mx-auto max-w-md px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
