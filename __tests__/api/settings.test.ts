import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow, WorkoutState } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockGetWorkoutState = vi.fn()
const mockSetRoutineDisabled = vi.fn()
const mockSetCyclesBeforeIncrease = vi.fn()
const mockSetProgram = vi.fn()
const mockDeleteRows = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  setRoutineDisabled: (...args: unknown[]) => mockSetRoutineDisabled(...args),
  setCyclesBeforeIncrease: (...args: unknown[]) => mockSetCyclesBeforeIncrease(...args),
  setProgram: (...args: unknown[]) => mockSetProgram(...args),
  deleteRows: (...args: unknown[]) => mockDeleteRows(...args),
}))

import { GET, PATCH } from '@/app/api/settings/route'

const defaultState: WorkoutState = {
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: ['Day 2 - RDL'], program: 'FSL',
}

const sampleRows: SheetRow[] = [
  { rowIndex: 2, date: '2026-03-28', routine: 'Day 1 - Press', setType: 'main', exercise: 'ohp', targetReps: '5', targetWeight: '95', actualReps: '5' },
  { rowIndex: 3, date: '2026-03-26', routine: 'Day 2 - RDL', setType: 'main', exercise: 'rdl', targetReps: '5', targetWeight: '135', actualReps: '5' },
  { rowIndex: 4, date: '', routine: 'Day 3 - Bench', setType: 'main', exercise: 'bench', targetReps: '5', targetWeight: '135', actualReps: '' },
]

describe('GET /api/settings', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset().mockResolvedValue(sampleRows)
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
  })

  it('returns all routines (including disabled), disabled list, cyclesBeforeIncrease, and program', async () => {
    const res = await GET()
    const data = await res.json()

    expect(data.allRoutines).toEqual([
      { name: 'Day 1 - Press', lastCompleted: '2026-03-28' },
      { name: 'Day 2 - RDL', lastCompleted: '2026-03-26' },
      { name: 'Day 3 - Bench', lastCompleted: null },
    ])
    expect(data.disabledRoutines).toEqual(['Day 2 - RDL'])
    expect(data.cyclesBeforeIncrease).toBe(3)
    expect(data.program).toBe('FSL')
  })
})

describe('PATCH /api/settings', () => {
  beforeEach(() => {
    mockSetRoutineDisabled.mockReset().mockResolvedValue(undefined)
    mockSetCyclesBeforeIncrease.mockReset().mockResolvedValue(undefined)
    mockSetProgram.mockReset().mockResolvedValue(undefined)
    mockDeleteRows.mockReset().mockResolvedValue(undefined)
  })

  it('calls setRoutineDisabled when routine payload is sent', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine: 'Day 2 - RDL', disabled: true }),
      })
    )
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockSetRoutineDisabled).toHaveBeenCalledWith('Day 2 - RDL', true)
    expect(mockSetCyclesBeforeIncrease).not.toHaveBeenCalled()
  })

  it('calls setCyclesBeforeIncrease when cyclesBeforeIncrease payload is sent', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cyclesBeforeIncrease: 4 }),
      })
    )
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockSetCyclesBeforeIncrease).toHaveBeenCalledWith(4)
    expect(mockSetRoutineDisabled).not.toHaveBeenCalled()
  })

  it('calls setProgram and deleteRows when program payload is sent', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 5, date: '', routine: 'Press Day', setType: 'FSL', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
      { rowIndex: 6, date: '', routine: 'Press Day', setType: 'FSL', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
      { rowIndex: 3, date: '2026-01-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5' },
    ] satisfies SheetRow[])
    mockSetProgram.mockResolvedValue(undefined)
    mockDeleteRows.mockResolvedValue(undefined)

    const res = await PATCH(
      new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program: 'BBB' }),
      })
    )
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockSetProgram).toHaveBeenCalledWith('BBB')
    expect(mockDeleteRows).toHaveBeenCalledWith([5, 6])  // only pending (date==='') rowIndices
    expect(mockSetCyclesBeforeIncrease).not.toHaveBeenCalled()
    expect(mockSetRoutineDisabled).not.toHaveBeenCalled()
  })
})
