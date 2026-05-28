import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExerciseConfig, SheetRow, WorkoutState } from '@/lib/types'

const mockGetExerciseConfig = vi.fn()
const mockGetWorkoutState = vi.fn()
const mockGetAllRows = vi.fn()
const mockUpdateWorkoutState = vi.fn()
const mockUpdateExerciseTrainingMax = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getExerciseConfig: (...args: unknown[]) => mockGetExerciseConfig(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  updateWorkoutState: (...args: unknown[]) => mockUpdateWorkoutState(...args),
  updateExerciseTrainingMax: (...args: unknown[]) => mockUpdateExerciseTrainingMax(...args),
}))

import { POST } from '@/app/api/advance-week/route'

function makePostRequest(body: object) {
  return POST(
    new Request('http://localhost/api/advance-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

function makeConfig(entries: Array<[string, Partial<ExerciseConfig>]>): Map<string, ExerciseConfig> {
  const map = new Map<string, ExerciseConfig>()
  for (const [key, partial] of entries) {
    const config: ExerciseConfig = {
      exercise: key, humanReadable: key, trainingMax: 100, increment: 5,
      type: 'main', roundTo: 2.5, equipment: 'barbell', ...partial,
    }
    map.set(key, config)
    map.set(`${key}::main`, config)
  }
  return map
}

const defaultState: WorkoutState = {
  currentWeek: 3, currentCycle: 3, cyclesBeforeIncrease: 3, disabledRoutines: [],
}

describe('POST /api/advance-week', () => {
  beforeEach(() => {
    mockGetExerciseConfig.mockReset()
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
    mockGetAllRows.mockReset().mockResolvedValue([])
    mockUpdateWorkoutState.mockReset().mockResolvedValue(undefined)
    mockUpdateExerciseTrainingMax.mockReset().mockResolvedValue(undefined)
  })

  it('sets week to 4 (deload) when choice is deload', async () => {
    const res = await makePostRequest({ choice: 'deload' })
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockUpdateWorkoutState).toHaveBeenCalledWith(4)
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalled()
  })

  it('bumps all main TMs and resets to week 1 cycle 1 when choice is skip', async () => {
    mockGetExerciseConfig.mockResolvedValue(makeConfig([
      ['barbell_press', { trainingMax: 165, increment: 5 }],
      ['back_squat', { trainingMax: 275, increment: 10 }],
    ]))

    const res = await makePostRequest({ choice: 'skip' })
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('barbell_press', 170, 'main')
    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('back_squat', 285, 'main')
    expect(mockUpdateWorkoutState).toHaveBeenCalledWith(1, 1)
  })

  it('does not bump TM for exercises only in disabled routines when skipping deload', async () => {
    mockGetWorkoutState.mockResolvedValue({
      ...defaultState,
      disabledRoutines: ['Day 2 - RDL'],
    })
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-01', routine: 'Day 1 - Press', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5' },
      { rowIndex: 3, date: '2026-03-01', routine: 'Day 2 - RDL', setType: 'main', exercise: 'rdl', targetReps: '5', targetWeight: '145', actualReps: '5' },
    ] satisfies SheetRow[])
    mockGetExerciseConfig.mockResolvedValue(makeConfig([
      ['barbell_press', { trainingMax: 165, increment: 5 }],
      ['rdl', { trainingMax: 225, increment: 10 }],
    ]))

    await makePostRequest({ choice: 'skip' })

    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('barbell_press', 170, 'main')
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalledWith('rdl', expect.anything(), expect.anything())
  })
})
