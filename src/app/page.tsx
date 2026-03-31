'use client'

import { useEffect, useState } from 'react'
import { RoutineCard } from '@/components/RoutineCard'
import type { RoutineSummary } from '@/lib/types'

export default function Home() {
  const [routines, setRoutines] = useState<RoutineSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/routines')
      .then((res) => res.json())
      .then((data) => {
        setRoutines(data)
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-fall-rust">531 Tracker</h1>
      <p className="mt-1 text-sm text-fall-bark-light">
        Select a routine to begin.
      </p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-center text-fall-bark-light">Loading...</p>
        ) : (
          routines.map((r) => (
            <RoutineCard
              key={r.name}
              name={r.name}
              lastCompleted={r.lastCompleted}
            />
          ))
        )}
      </div>
    </div>
  )
}
