'use client'

import { useState } from 'react'
import { EditableField } from './EditableField'
import { PlateCalculatorModal } from './PlateCalculatorModal'
import type { SheetRow, EditableColumn } from '@/lib/types'

interface SetRowProps {
  set: SheetRow
  equipment?: string
  onUpdate: (rowIndex: number, column: EditableColumn, value: string) => void
}

function showPlateButton(targetWeight: string, equipment?: string): boolean {
  if (!equipment || !['barbell', 'dumbbell'].includes(equipment)) return false
  if (targetWeight === 'BW' || targetWeight === '') return false
  return !isNaN(parseFloat(targetWeight))
}

export function SetRow({ set, equipment, onUpdate }: SetRowProps) {
  const [actualReps, setActualReps] = useState(set.actualReps || set.targetReps)
  const [saved, setSaved] = useState(!!set.actualReps)
  const [showPlates, setShowPlates] = useState(false)

  function handleButtonClick() {
    if (saved) {
      onUpdate(set.rowIndex, 'actualReps', '')
      setSaved(false)
    } else {
      onUpdate(set.rowIndex, 'actualReps', actualReps)
      setSaved(true)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-fall-wheat py-3 last:border-b-0">
        <span className="flex-1 text-sm font-medium">{set.exercise}</span>

        <EditableField
          value={set.targetWeight}
          onSave={(val) => onUpdate(set.rowIndex, 'targetWeight', val)}
        />

        {showPlateButton(set.targetWeight, equipment) && (
          <button
            type="button"
            aria-label="Show plate breakdown"
            onClick={() => setShowPlates(true)}
            className="text-fall-bark-light hover:text-fall-copper active:text-fall-copper"
          >
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="7" y="2" width="2" height="12" rx="0.5" />
              <rect x="2" y="4" width="2" height="8" rx="1" />
              <rect x="12" y="4" width="2" height="8" rx="1" />
              <rect x="1" y="5.5" width="2" height="5" rx="0.5" />
              <rect x="13" y="5.5" width="2" height="5" rx="0.5" />
            </svg>
          </button>
        )}

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
          aria-label={saved ? 'Uncomplete set' : 'Save'}
          onClick={handleButtonClick}
          className={`rounded px-2 py-1 text-xs font-medium text-white ${saved ? 'bg-fall-copper' : 'bg-fall-olive'}`}
        >
          ✓
        </button>
      </div>

      {showPlates && (
        <PlateCalculatorModal
          targetWeight={set.targetWeight}
          equipment={equipment ?? 'barbell'}
          onClose={() => setShowPlates(false)}
        />
      )}
    </>
  )
}
