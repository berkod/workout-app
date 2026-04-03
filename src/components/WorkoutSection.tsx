'use client'

import { SetRow } from './SetRow'
import type { SetGroup, EditableColumn } from '@/lib/types'

interface WorkoutSectionProps {
  group: SetGroup
  isOpen: boolean
  onToggle: () => void
  onUpdate: (rowIndex: number, column: EditableColumn, value: string) => void
}

export function WorkoutSection({
  group,
  isOpen,
  onToggle,
  onUpdate,
}: WorkoutSectionProps) {
  const completedCount = group.sets.filter((s) => s.actualReps !== '').length
  const totalCount = group.sets.length

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-fall-wheat bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-fall-wheat"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-fall-amber">
            {group.setType}
          </span>
          <span className="ml-2 text-sm font-medium text-fall-bark">
            {group.displayName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fall-bark-light">
            {completedCount}/{totalCount}
          </span>
          <span className="text-fall-bark-light">{isOpen ? '▾' : '▸'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-fall-wheat px-4">
          {group.sets.map((set) => (
            <SetRow key={set.rowIndex} set={set} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
