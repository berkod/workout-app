import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExerciseConfig, SheetRow } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockUpdateCell = vi.fn()
const mockGetExerciseConfig = vi.fn()
const mockGetWorkoutState = vi.fn()
const mockUpdateWorkoutState = vi.fn()
const mockUpdateExerciseTrainingMax = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  updateCell: (...args: unknown[]) => mockUpdateCell(...args),
  getExerciseConfig: (...args: unknown[]) => mockGetExerciseConfig(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  updateWorkoutState: (...args: unknown[]) => mockUpdateWorkoutState(...args),
  updateExerciseTrainingMax: (...args: unknown[]) => mockUpdateExerciseTrainingMax(...args),
}))

import { POST } from '@/app/api/complete/route'

function makePostRequest(body: object) {
  return POST(
    new Request('http://localhost/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

function makeConfig(entries: Array<[string, Partial<ExerciseConfig>]>): Map<string, ExerciseConfig> {
  const map = new Map<string, ExerciseConfig>()
  for (const [key, partial] of entries) {
    const config: ExerciseConfig = { exercise: key, humanReadable: key, trainingMax: 100, increment: 5, type: 'main', roundTo: 2.5, ...partial }
    map.set(key, config)
    const compoundType = config.type === 'bodyweight' ? 'accessory' : config.type
    map.set(`${key}::${compoundType}`, config)
  }
  return map
}

const emptyConfig = new Map()

describe('POST /api/complete', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockUpdateCell.mockReset().mockResolvedValue(undefined)
    mockGetExerciseConfig.mockReset().mockResolvedValue(emptyConfig)
    mockGetWorkoutState.mockReset().mockResolvedValue({ currentWeek: 1 })
    mockUpdateWorkoutState.mockReset().mockResolvedValue(undefined)
    mockUpdateExerciseTrainingMax.mockReset().mockResolvedValue(undefined)
  })

  it('stamps date and fills empty actualReps only for pending rows of the routine', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'warm-up', exercise: 'barbell_press', targetReps: '5', targetWeight: '80', actualReps: '5' },
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'Squat Day', setType: 'main', exercise: 'back_squat', targetReps: '5', targetWeight: '185', actualReps: '' },
    ] satisfies SheetRow[])

    await makePostRequest({ routine: 'Press Day' })

    // Both Press Day rows get a date stamp
    expect(mockUpdateCell).toHaveBeenCalledWith(2, 'A', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'A', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    // Row 3 had empty actualReps — gets filled with '0'
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'G', '0')
    // Squat Day row untouched
    expect(mockUpdateCell).not.toHaveBeenCalledWith(4, expect.anything(), expect.anything())
  })

  it('does not touch already-completed (dated) rows', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '6' },
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '140', actualReps: '' },
    ] satisfies SheetRow[])

    await makePostRequest({ routine: 'Press Day' })

    expect(mockUpdateCell).not.toHaveBeenCalledWith(2, expect.anything(), expect.anything())
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'A', expect.any(String))
  })

  it('returns deloadPrompt:false and advances to week 2 after completing week 1', async () => {
    mockGetWorkoutState.mockResolvedValue({ currentWeek: 1 })
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5' },
    ] satisfies SheetRow[])

    const res = await makePostRequest({ routine: 'Press Day' })
    const data = await res.json()

    expect(data.deloadPrompt).toBe(false)
    expect(mockUpdateWorkoutState).toHaveBeenCalledWith(2)
  })

  it('returns deloadPrompt:true and does not advance week after completing week 3', async () => {
    mockGetWorkoutState.mockResolvedValue({ currentWeek: 3 })
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '1+', targetWeight: '155', actualReps: '3' },
    ] satisfies SheetRow[])

    const res = await makePostRequest({ routine: 'Press Day' })
    const data = await res.json()

    expect(data.deloadPrompt).toBe(true)
    expect(mockUpdateWorkoutState).not.toHaveBeenCalled()
  })

  it('increments main TMs and resets to week 1 after completing week 4 (deload)', async () => {
    mockGetWorkoutState.mockResolvedValue({ currentWeek: 4 })
    mockGetExerciseConfig.mockResolvedValue(makeConfig([
      ['barbell_press', { trainingMax: 165, increment: 5, type: 'main' }],
      ['back_squat', { trainingMax: 275, increment: 10, type: 'main' }],
    ]))
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '5' },
    ] satisfies SheetRow[])

    await makePostRequest({ routine: 'Press Day' })

    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('barbell_press', 170, 'main')
    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('back_squat', 285, 'main')
    expect(mockUpdateWorkoutState).toHaveBeenCalledWith(1)
  })

  it('increments accessory training max on completion', async () => {
    mockGetWorkoutState.mockResolvedValue({ currentWeek: 1 })
    mockGetExerciseConfig.mockResolvedValue(makeConfig([
      ['pullups', { trainingMax: 0, increment: 0, type: 'bodyweight' }],
      ['db_bench_press', { trainingMax: 50, increment: 5, type: 'accessory' }],
    ]))
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '50', actualReps: '10' },
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'accessory', exercise: 'pullups', targetReps: '8', targetWeight: 'BW', actualReps: '8' },
    ] satisfies SheetRow[])

    await makePostRequest({ routine: 'Press Day' })

    // Accessory incremented
    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('db_bench_press', 55, 'accessory')
    // Bodyweight NOT incremented
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalledWith('pullups', expect.anything(), expect.anything())
  })

  it('returns error when no pending rows found', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5' },
    ] satisfies SheetRow[])

    const res = await makePostRequest({ routine: 'Press Day' })
    const data = await res.json()

    expect(data.success).toBe(false)
    expect(mockUpdateCell).not.toHaveBeenCalled()
  })
})
