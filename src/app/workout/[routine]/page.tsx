'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { WorkoutSection } from '@/components/WorkoutSection'
import { CompleteButton } from '@/components/CompleteButton'
import type { WorkoutData, SetGroup, EditableColumn } from '@/lib/types'

export default function WorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const routineName = decodeURIComponent(params.routine as string)

  const [workout, setWorkout] = useState<WorkoutData | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/workout/${encodeURIComponent(routineName)}`)
      .then((res) => res.json())
      .then((data: WorkoutData) => {
        setWorkout(data)
        if (data.groups.length > 0) {
          setOpenSections(new Set([sectionKey(data.groups[0])]))
        }
      })
  }, [routineName])

  function sectionKey(group: SetGroup) {
    return `${group.setType}::${group.exercise}`
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleUpdate = useCallback(
    async (rowIndex: number, column: EditableColumn, value: string) => {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/sets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, column, value }),
      })

      setWorkout((prev) => {
        if (!prev) return prev
        const updated = {
          ...prev,
          groups: prev.groups.map((g) => ({
            ...g,
            sets: g.sets.map((s) =>
              s.rowIndex === rowIndex ? { ...s, [column]: value } : s
            ),
          })),
        }

        if (column === 'actualReps') {
          const currentGroupIndex = updated.groups.findIndex((g) =>
            g.sets.some((s) => s.rowIndex === rowIndex)
          )
          if (currentGroupIndex !== -1) {
            const currentGroup = updated.groups[currentGroupIndex]
            const allComplete = currentGroup.sets.every(
              (s) => s.actualReps !== ''
            )
            if (allComplete) {
              setOpenSections((prev) => {
                const next = new Set(prev)
                next.delete(sectionKey(currentGroup))
                if (currentGroupIndex + 1 < updated.groups.length) {
                  next.add(sectionKey(updated.groups[currentGroupIndex + 1]))
                }
                return next
              })
            }
          }
        }

        return updated
      })
    },
    []
  )

  async function handleStartWorkout() {
    setStarting(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/workout/${encodeURIComponent(routineName)}`, {
      method: 'POST',
    })
    const data: WorkoutData = await res.json()
    setWorkout(data)
    if (data.groups.length > 0) {
      setOpenSections(new Set([sectionKey(data.groups[0])]))
    }
    setStarting(false)
  }

  async function handleComplete() {
    setCompleting(true)
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine: routineName }),
    })
    router.push('/')
  }

  if (!workout) {
    return <p className="text-center text-fall-bark-light">Loading...</p>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fall-rust">{workout.routine}</h1>
      <p className="mt-0.5 text-sm text-fall-bark-light">
        Week {workout.week} · Cycle {workout.cycle}
      </p>

      {workout.isPreview && (
        <button
          type="button"
          onClick={handleStartWorkout}
          disabled={starting}
          className="mt-4 w-full rounded-xl bg-fall-rust py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {starting ? 'Starting…' : 'Start Workout'}
        </button>
      )}

      <div className="mt-4">
        {workout.groups.map((group) => {
          const key = sectionKey(group)
          return (
            <WorkoutSection
              key={key}
              group={group}
              isOpen={openSections.has(key)}
              isPreview={workout.isPreview}
              onToggle={() => toggleSection(key)}
              onUpdate={handleUpdate}
            />
          )
        })}
      </div>

      {!workout.isPreview && (
        <CompleteButton onComplete={handleComplete} loading={completing} />
      )}
    </div>
  )
}
