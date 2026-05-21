'use client'

import { useMemo } from 'react'
import { getEquipmentConfig } from '@/lib/equipment'
import { calculatePlates } from '@/lib/plateCalculator'
import type { DumbbellBreakdown, BarbellBreakdown } from '@/lib/plateCalculator'

interface PlateCalculatorModalProps {
  targetWeight: string
  equipment: string
  onClose: () => void
}

export function PlateCalculatorModal({ targetWeight, equipment, onClose }: PlateCalculatorModalProps) {
  const breakdown = useMemo(() => {
    const config = getEquipmentConfig()
    if (!config) return null
    return calculatePlates(targetWeight, equipment, config)
  }, [targetWeight, equipment])

  const config = useMemo(() => getEquipmentConfig(), [])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl p-6 w-full max-w-md shadow-xl mb-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-fall-rust">
            Plate Calculator
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close plate calculator"
            className="text-fall-bark-light text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-2xl font-bold text-fall-bark mb-4">{targetWeight} lbs</p>

        {!config && (
          <p className="text-sm text-fall-bark-light">
            Sync your plate inventory using the Equipment button in the nav bar.
          </p>
        )}

        {config && !breakdown && (
          <p className="text-sm text-fall-bark-light">
            No plate calculation available for this exercise type.
          </p>
        )}

        {breakdown?.type === 'barbell' && <BarbellDisplay breakdown={breakdown} />}
        {breakdown?.type === 'dumbbell' && <DumbbellDisplay breakdown={breakdown} />}
      </div>
    </div>
  )
}

function BarbellDisplay({ breakdown }: { breakdown: BarbellBreakdown }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm border-b border-fall-wheat pb-2">
        <span className="text-fall-bark-light">Bar</span>
        <span className="font-medium text-fall-bark">{breakdown.barWeight} lbs</span>
      </div>
      {breakdown.perSide.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fall-amber mb-2">
            Per side
          </p>
          <div className="space-y-1">
            {breakdown.perSide.map((p) => (
              <div key={p.weight} className="flex justify-between text-sm">
                <span className="text-fall-bark-light">{p.count} × {p.weight} lb</span>
                <span className="font-medium text-fall-bark">{p.count * p.weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!breakdown.achievable && (
        <p className="text-xs text-fall-rust mt-2">
          ⚠ Exact weight not achievable with available plates
        </p>
      )}
    </div>
  )
}

function DumbbellDisplay({ breakdown }: { breakdown: DumbbellBreakdown }) {
  const paired = breakdown.plates.filter((p) => p.paired)
  const singles = breakdown.plates.filter((p) => !p.paired)

  return (
    <div className="space-y-3">
      {paired.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fall-amber mb-2">
            Pairs (both sides)
          </p>
          <div className="space-y-1">
            {paired.map((p) => (
              <div key={`pair-${p.weight}`} className="flex justify-between text-sm">
                <span className="text-fall-bark-light">{p.count} × {p.weight} lb</span>
                <span className="font-medium text-fall-bark">{p.count * p.weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {singles.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fall-amber mb-2">
            Singles (one side)
          </p>
          <div className="space-y-1">
            {singles.map((p) => (
              <div key={`single-${p.weight}`} className="flex justify-between text-sm">
                <span className="text-fall-bark-light">{p.count} × {p.weight} lb</span>
                <span className="font-medium text-fall-bark">{p.count * p.weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!breakdown.achievable && (
        <p className="text-xs text-fall-rust mt-2">
          ⚠ Exact weight not achievable with available plates
        </p>
      )}
    </div>
  )
}
