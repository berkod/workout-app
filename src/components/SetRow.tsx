'use client'

import { useState } from 'react'
import { EditableField } from './EditableField'
import type { SheetRow, EditableColumn } from '@/lib/types'

interface SetRowProps {
  set: SheetRow
  onUpdate: (rowIndex: number, column: EditableColumn, value: string) => void
}

export function SetRow({ set, onUpdate }: SetRowProps) {
  const [actualReps, setActualReps] = useState(set.actualReps)
  const [saved, setSaved] = useState(!!set.actualReps)

  function handleSaveActualReps() {
    onUpdate(set.rowIndex, 'actualReps', actualReps)
    setSaved(true)
  }

  return (
    <div className="flex items-center gap-3 border-b border-fall-wheat py-3 last:border-b-0">
      <span className="flex-1 text-sm font-medium">{set.exercise}</span>

      <EditableField
        value={set.targetWeight}
        onSave={(val) => onUpdate(set.rowIndex, 'targetWeight', val)}
      />

      <span className="text-fall-bark-light">×</span>

      <EditableField
        value={set.targetReps}
        onSave={(val) => onUpdate(set.rowIndex, 'targetReps', val)}
      />

      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        placeholder="Reps"
        value={actualReps}
        onChange={(e) => {
          setActualReps(e.target.value)
          setSaved(false)
        }}
        className="w-14 rounded border border-fall-wheat bg-white px-2 py-1 text-center text-sm focus:border-fall-copper focus:outline-none"
      />

      <button
        type="button"
        aria-label="Save"
        onClick={handleSaveActualReps}
        disabled={saved && actualReps === set.actualReps}
        className="rounded bg-fall-olive px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
      >
        ✓
      </button>
    </div>
  )
}
