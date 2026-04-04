import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockGetExerciseConfig = vi.fn()
const mockGetWorkoutState = vi.fn()
const mockAppendRows = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getExerciseConfig: (...args: unknown[]) => mockGetExerciseConfig(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  appendRows: (...args: unknown[]) => mockAppendRows(...args),
}))

import { GET } from '@/app/api/workout/[routine]/route'

function makeRequest(routine: string) {
  return GET(
    new Request(`http://localhost/api/workout/${encodeURIComponent(routine)}`),
    { params: Promise.resolve({ routine: encodeURIComponent(routine) }) }
  )
}

const emptyConfig = new Map()

describe('GET /api/workout/[routine]', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockGetExerciseConfig.mockResolvedValue(emptyConfig)
    mockGetWorkoutState.mockResolvedValue({ currentWeek: 1 })
    mockAppendRows.mockResolvedValue(undefined)
  })

  it('returns pending (empty-date) rows grouped by setType and exercise', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '80', actualReps: '' },
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '100', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
      { rowIndex: 5, date: '', routine: 'Squat Day', setType: 'warm-up', exercise: 'back_squat', targetReps: '5', targetWeight: '135', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeRequest('Press Day')
    const data = await response.json()

    expect(data.routine).toBe('Press Day')
    expect(data.groups).toHaveLength(2)
    expect(data.groups[0].setType).toBe('warm-up')
    expect(data.groups[0].sets).toHaveLength(2)
    expect(data.groups[1].setType).toBe('main')
    expect(data.groups[1].sets).toHaveLength(1)
  })

  it('does not include completed (dated) rows when pending rows exist', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5' },
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '140', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeRequest('Press Day')
    const data = await response.json()

    expect(data.groups[0].sets).toHaveLength(1)
    expect(data.groups[0].sets[0].rowIndex).toBe(3)
  })

  it('returns empty groups for unknown routine', async () => {
    mockGetAllRows.mockResolvedValue([])

    const response = await makeRequest('Day 99 – Fake')
    const data = await response.json()

    expect(data.groups).toEqual([])
  })

  it('enriches groups with displayName from config', async () => {
    const config = new Map()
    config.set('barbell_press::main', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 165, increment: 5, type: 'main' })
    config.set('barbell_press', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 165, increment: 5, type: 'main' })
    mockGetExerciseConfig.mockResolvedValue(config)

    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeRequest('Press Day')
    const data = await response.json()

    expect(data.groups[0].displayName).toBe('Barbell Press')
  })
})
