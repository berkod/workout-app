'use client'

import { useEffect, useState } from 'react'
import type { ExerciseHistory, SessionRecord } from '@/app/api/history/route'

function formatDate(iso: string): string {
  // Parse as local date to avoid UTC-offset shifts
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function RepCell({
  session,
  isMain,
}: {
  session: SessionRecord
  isMain: boolean
}) {
  const actual = session.topSetActual
  const target = session.topSetTarget

  if (!actual && !target) return <span className="text-fall-bark-light">—</span>

  if (isMain) {
    const exceeded = !!actual && Number(actual) > parseInt(target, 10)
    return (
      <span>
        <span className={exceeded ? 'font-semibold text-fall-olive' : 'text-fall-bark'}>
          {actual || '—'}
        </span>
        <span className="ml-1 text-xs text-fall-bark-light">/ {target}</span>
      </span>
    )
  }

  return <span className="text-fall-bark">{actual || target}</span>
}

function ExerciseCard({ ex }: { ex: ExerciseHistory }) {
  if (ex.sessions.length === 0) return null

  const isMain = ex.type === 'main'
  const isBW = ex.type === 'bodyweight'

  return (
    <article
      className="overflow-hidden rounded-lg border border-fall-wheat bg-white shadow-sm"
      aria-labelledby={`ex-${ex.exercise}`}
    >
      <header className="flex items-center justify-between border-b border-fall-wheat px-4 py-3">
        <h2 id={`ex-${ex.exercise}`} className="font-semibold text-fall-bark">
          {ex.displayName}
        </h2>
        {!isBW && (
          <span
            className="rounded-full bg-fall-wheat px-2.5 py-0.5 text-xs font-medium text-fall-bark-light"
            aria-label={`Training max ${ex.currentTM} pounds`}
          >
            TM {ex.currentTM} lb
          </span>
        )}
      </header>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-fall-wheat/60">
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium text-fall-bark-light"
            >
              Date
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right text-xs font-medium text-fall-bark-light"
            >
              Weight
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right text-xs font-medium text-fall-bark-light"
            >
              {isMain ? 'Got / Target' : 'Reps'}
            </th>
          </tr>
        </thead>
        <tbody>
          {ex.sessions.map((s, i) => (
            <tr
              key={s.date + i}
              className={i % 2 === 0 ? '' : 'bg-fall-cream/50'}
            >
              <td className="px-4 py-2.5 text-fall-bark-light">{formatDate(s.date)}</td>
              <td className="px-4 py-2.5 text-right font-medium text-fall-bark">
                {s.topSetWeight === 'BW' ? 'BW' : `${s.topSetWeight} lb`}
              </td>
              <td className="px-4 py-2.5 text-right">
                <RepCell session={s} isMain={isMain} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ExerciseHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/history`)
      .then((r) => r.json())
      .then((data: ExerciseHistory[]) => {
        setHistory(data)
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-fall-rust">Progress</h1>
      <p className="mt-1 text-sm text-fall-bark-light">
        Recent performance by exercise. Green reps beat the target.
      </p>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-center text-fall-bark-light" aria-live="polite">
            Loading…
          </p>
        ) : history.length === 0 ? (
          <p className="text-center text-fall-bark-light">No workout history yet.</p>
        ) : (
          history.map((ex) => (
            <ExerciseCard key={`${ex.exercise}::${ex.type}`} ex={ex} />
          ))
        )}
      </div>
    </div>
  )
}
