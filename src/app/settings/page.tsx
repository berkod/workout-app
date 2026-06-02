'use client'

import { useEffect, useState } from 'react'
import { saveEquipmentConfig } from '@/lib/equipment'
import type { EquipmentConfig, Program, RoutineSummary } from '@/lib/types'

interface SettingsData {
  allRoutines: RoutineSummary[]
  disabledRoutines: string[]
  cyclesBeforeIncrease: 3 | 4
  program: Program
}

type SyncState = 'idle' | 'loading' | 'done'

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('idle')

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`)
      .then((res) => res.json())
      .then(setData)
  }, [])

  async function toggleRoutine(routine: string, currentlyDisabled: boolean) {
    const newDisabled = !currentlyDisabled
    setData((prev) =>
      prev
        ? {
            ...prev,
            disabledRoutines: newDisabled
              ? [...prev.disabledRoutines, routine]
              : prev.disabledRoutines.filter((r) => r !== routine),
          }
        : prev
    )
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine, disabled: newDisabled }),
    })
  }

  async function setCycles(n: 3 | 4) {
    setData((prev) => (prev ? { ...prev, cyclesBeforeIncrease: n } : prev))
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cyclesBeforeIncrease: n }),
    })
  }

  async function changeProgram(p: Program) {
    setData((prev) => (prev ? { ...prev, program: p } : prev))
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program: p }),
    })
  }

  async function handleSyncEquipment() {
    if (syncState === 'loading') return
    setSyncState('loading')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/equipment`)
      if (res.ok) {
        const config: EquipmentConfig = await res.json()
        saveEquipmentConfig(config)
        setSyncState('done')
        setTimeout(() => setSyncState('idle'), 1500)
      } else {
        setSyncState('idle')
      }
    } catch {
      setSyncState('idle')
    }
  }

  if (!data) {
    return <p className="text-center text-fall-bark-light">Loading...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-fall-rust">Settings</h1>

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="text-base font-semibold text-fall-rust mb-3">Routines</h2>
          <ul className="space-y-2">
            {data.allRoutines.map((r) => {
              const isDisabled = data.disabledRoutines.includes(r.name)
              return (
                <li
                  key={r.name}
                  className="flex items-center justify-between rounded-lg border border-fall-wheat bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className={`text-sm font-medium ${isDisabled ? 'text-fall-bark-light' : 'text-fall-rust'}`}>
                      {r.name}
                    </p>
                    {isDisabled && (
                      <p className="text-xs text-fall-bark-light mt-0.5">
                        Training max frozen — update in sheet to resume progression
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isDisabled}
                    aria-label={`${isDisabled ? 'Enable' : 'Disable'} ${r.name}`}
                    onClick={() => toggleRoutine(r.name, isDisabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      !isDisabled ? 'bg-fall-rust' : 'bg-fall-wheat'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        !isDisabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-fall-rust mb-3">Progression</h2>
          <div className="rounded-lg border border-fall-wheat bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-fall-bark mb-3">Cycles before TM increase</p>
            <div className="flex gap-3">
              {([3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCycles(n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    data.cyclesBeforeIncrease === n
                      ? 'bg-fall-rust text-white border-fall-rust'
                      : 'border-fall-wheat text-fall-bark-light'
                  }`}
                >
                  {n} cycles
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-fall-rust mb-3">Program</h2>
          <div className="rounded-lg border border-fall-wheat bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-fall-bark mb-3">Supplemental work</p>
            <p className="text-xs text-fall-bark-light mb-3">
              Switching programs clears any in-progress workouts.
            </p>
            <div className="flex gap-3">
              {(['FSL', 'BBB'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => changeProgram(p)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    data.program === p
                      ? 'bg-fall-rust text-white border-fall-rust'
                      : 'border-fall-wheat text-fall-bark-light'
                  }`}
                >
                  {p === 'FSL' ? 'First Set Last' : 'Boring But Big'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-fall-rust mb-3">Equipment</h2>
          <button
            type="button"
            onClick={handleSyncEquipment}
            className="w-full rounded-lg border border-fall-wheat bg-white p-4 shadow-sm text-sm font-medium text-fall-bark active:bg-fall-wheat transition-colors"
          >
            {syncState === 'done'
              ? 'Synced ✓'
              : syncState === 'loading'
              ? 'Syncing…'
              : 'Sync Equipment from Google Sheet'}
          </button>
        </section>
      </div>
    </div>
  )
}
