import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow, WorkoutState } from '@/lib/types'

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

import { GET, POST } from '@/app/api/workout/[routine]/route'

function makeGET(routine: string) {
  return GET(
    new Request(`http://localhost/api/workout/${encodeURIComponent(routine)}`),
    { params: Promise.resolve({ routine: encodeURIComponent(routine) }) }
  )
}

function makePOST(routine: string) {
  return POST(
    new Request(`http://localhost/api/workout/${encodeURIComponent(routine)}`, { method: 'POST' }),
    { params: Promise.resolve({ routine: encodeURIComponent(routine) }) }
  )
}

const emptyConfig = new Map()

const defaultState: WorkoutState = {
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: [], program: 'BBB',
}

describe('GET /api/workout/[routine]', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockGetExerciseConfig.mockResolvedValue(emptyConfig)
    mockGetWorkoutState.mockResolvedValue(defaultState)
    mockAppendRows.mockResolvedValue(undefined)
  })

  it('returns pending (empty-date) rows grouped by setType and exercise', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '80', actualReps: '' },
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '100', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
      { rowIndex: 5, date: '', routine: 'Squat Day', setType: 'warm-up', exercise: 'back_squat', targetReps: '5', targetWeight: '135', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeGET('Press Day')
    const data = await response.json()

    expect(data.routine).toBe('Press Day')
    expect(data.isPreview).toBe(false)
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

    const response = await makeGET('Press Day')
    const data = await response.json()

    expect(data.isPreview).toBe(false)
    expect(data.groups[0].sets).toHaveLength(1)
    expect(data.groups[0].sets[0].rowIndex).toBe(3)
  })

  it('returns empty groups for unknown routine', async () => {
    mockGetAllRows.mockResolvedValue([])

    const response = await makeGET('Day 99 – Fake')
    const data = await response.json()

    expect(data.groups).toEqual([])
    expect(data.isPreview).toBe(false)
  })

  it('enriches groups with displayName from config', async () => {
    const config = new Map()
    config.set('barbell_press::main', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 165, increment: 5, type: 'main' })
    config.set('barbell_press', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 165, increment: 5, type: 'main' })
    mockGetExerciseConfig.mockResolvedValue(config)

    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeGET('Press Day')
    const data = await response.json()

    expect(data.groups[0].displayName).toBe('Barbell Press')
  })

  it('returns isPreview:true with computed rows when no pending rows but history exists', async () => {
    const config = new Map()
    config.set('barbell_press::main', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 100, increment: 5, type: 'main', roundTo: 5 })
    config.set('barbell_press', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 100, increment: 5, type: 'main', roundTo: 5 })
    mockGetExerciseConfig.mockResolvedValue(config)
    mockGetWorkoutState.mockResolvedValue({ ...defaultState, currentWeek: 1 })

    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-01-01', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '45', actualReps: '5' },
      { rowIndex: 3, date: '2026-01-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '5' },
    ] satisfies SheetRow[])

    const response = await makeGET('Press Day')
    const data = await response.json()

    expect(data.isPreview).toBe(true)
    expect(data.groups.length).toBeGreaterThan(0)
    // Preview rows have negative rowIndices (sentinel values)
    expect(data.groups[0].sets[0].rowIndex).toBeLessThan(0)
    // appendRows must NOT have been called
    expect(mockAppendRows).not.toHaveBeenCalled()
  })
})

describe('POST /api/workout/[routine]', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockGetExerciseConfig.mockReset().mockResolvedValue(emptyConfig)
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
    mockAppendRows.mockReset().mockResolvedValue(undefined)
  })

  it('generates and appends rows, returns them with isPreview:false', async () => {
    const config = new Map()
    config.set('barbell_press::main', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 100, increment: 5, type: 'main', roundTo: 5 })
    config.set('barbell_press', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 100, increment: 5, type: 'main', roundTo: 5 })
    mockGetExerciseConfig.mockResolvedValue(config)

    const historicalRows: SheetRow[] = [
      { rowIndex: 2, date: '2026-01-01', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '45', actualReps: '5' },
      { rowIndex: 3, date: '2026-01-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '5' },
    ]

    // First getAllRows call: no pending, has history
    // Second call (after appendRows): returns historical + newly appended rows
    mockGetAllRows
      .mockResolvedValueOnce(historicalRows)
      .mockResolvedValueOnce([
        ...historicalRows,
        { rowIndex: 4, date: '', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '45', actualReps: '' },
        { rowIndex: 5, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '' },
      ])

    const response = await makePOST('Press Day')
    const data = await response.json()

    expect(mockAppendRows).toHaveBeenCalledOnce()
    expect(data.isPreview).toBe(false)
    expect(data.groups.length).toBeGreaterThan(0)
    // Real rows have positive rowIndices
    expect(data.groups[0].sets[0].rowIndex).toBeGreaterThan(0)
  })

  it('is idempotent: returns existing pending rows without re-appending', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 4, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makePOST('Press Day')
    const data = await response.json()

    expect(mockAppendRows).not.toHaveBeenCalled()
    expect(data.isPreview).toBe(false)
    expect(data.groups[0].sets[0].rowIndex).toBe(4)
  })

  it('returns empty groups when routine has no history', async () => {
    mockGetAllRows.mockResolvedValue([])

    const response = await makePOST('Press Day')
    const data = await response.json()

    expect(mockAppendRows).not.toHaveBeenCalled()
    expect(data.groups).toEqual([])
    expect(data.isPreview).toBe(false)
  })
})
