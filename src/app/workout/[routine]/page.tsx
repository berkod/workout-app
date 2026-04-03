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
  const [showDeloadPrompt, setShowDeloadPrompt] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/workout/${encodeURIComponent(routineName)}`)
      .then((res) => res.json())
      .then((data: WorkoutData) => {
        setWorkout(data)
        // Open the first section (warm-up) by default
        if (data.groups.length > 0) {
          const firstKey = sectionKey(data.groups[0])
          setOpenSections(new Set([firstKey]))
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

      // Update local state
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

        // Auto-advance: if all sets in a section are now complete, close it and open next
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
                // Open next section if it exists
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

  async function handleComplete() {
    setCompleting(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine: routineName }),
    })
    const data = await res.json()
    if (data.deloadPrompt) {
      setCompleting(false)
      setShowDeloadPrompt(true)
    } else {
      router.push('/')
    }
  }

  async function handleDeloadChoice(choice: 'deload' | 'skip') {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/advance-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice }),
    })
    router.push('/')
  }

  if (!workout) {
    return <p className="text-center text-fall-bark-light">Loading...</p>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fall-rust">{workout.routine}</h1>

      <div className="mt-4">
        {workout.groups.map((group) => {
          const key = sectionKey(group)
          return (
            <WorkoutSection
              key={key}
              group={group}
              isOpen={openSections.has(key)}
              onToggle={() => toggleSection(key)}
              onUpdate={handleUpdate}
            />
          )
        })}
      </div>

      <CompleteButton onComplete={handleComplete} loading={completing} />

      {showDeloadPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-fall-rust mb-2">3 Weeks Complete</h2>
            <p className="text-sm text-fall-bark-light mb-6">
              You&apos;ve finished a full cycle. Would you like to do a deload week before starting the next cycle?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDeloadChoice('deload')}
                className="w-full py-3 rounded-xl bg-fall-rust text-white font-semibold text-sm"
              >
                Do Deload Week
              </button>
              <button
                onClick={() => handleDeloadChoice('skip')}
                className="w-full py-3 rounded-xl border border-fall-rust text-fall-rust font-semibold text-sm"
              >
                Skip — Start Next Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
