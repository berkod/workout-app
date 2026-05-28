import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow, WorkoutState } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockGetWorkoutState = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
}))

import { GET } from '@/app/api/routines/route'

const defaultState: WorkoutState = {
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: [],
}

describe('GET /api/routines', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
  })

  it('returns unique routines with last completed dates', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-25', routine: 'Day 1 – Press', setType: 'warm-up', exercise: 'OHP', targetReps: '5', targetWeight: '45', actualReps: '5' },
      { rowIndex: 3, date: '2026-03-28', routine: 'Day 1 – Press', setType: 'main', exercise: 'OHP', targetReps: '5', targetWeight: '95', actualReps: '5' },
      { rowIndex: 4, date: '2026-03-26', routine: 'Day 2 – RDL', setType: 'warm-up', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '5' },
      { rowIndex: 5, date: '', routine: 'Day 3 – Bench', setType: 'warm-up', exercise: 'Bench', targetReps: '5', targetWeight: '45', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual([
      { name: 'Day 1 – Press', lastCompleted: '2026-03-28' },
      { name: 'Day 2 – RDL', lastCompleted: '2026-03-26' },
      { name: 'Day 3 – Bench', lastCompleted: null },
    ])
  })

  it('returns empty array when no data', async () => {
    mockGetAllRows.mockResolvedValue([])
    const response = await GET()
    const data = await response.json()
    expect(data).toEqual([])
  })

  it('filters out disabled routines', async () => {
    mockGetWorkoutState.mockResolvedValue({
      ...defaultState,
      disabledRoutines: ['Day 2 – RDL'],
    })
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-28', routine: 'Day 1 – Press', setType: 'main', exercise: 'OHP', targetReps: '5', targetWeight: '95', actualReps: '5' },
      { rowIndex: 3, date: '2026-03-26', routine: 'Day 2 – RDL', setType: 'main', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '5' },
    ] satisfies SheetRow[])

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual([{ name: 'Day 1 – Press', lastCompleted: '2026-03-28' }])
  })
})
