import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExerciseConfig, SheetRow, WorkoutState, SessionEntry } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockUpdateCell = vi.fn()
const mockGetExerciseConfig = vi.fn()
const mockGetWorkoutState = vi.fn()
const mockUpdateExerciseTrainingMax = vi.fn()
const mockGetSessions = vi.fn()
const mockAppendSession = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  updateCell: (...args: unknown[]) => mockUpdateCell(...args),
  getExerciseConfig: (...args: unknown[]) => mockGetExerciseConfig(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  updateExerciseTrainingMax: (...args: unknown[]) => mockUpdateExerciseTrainingMax(...args),
  getSessions: (...args: unknown[]) => mockGetSessions(...args),
  appendSession: (...args: unknown[]) => mockAppendSession(...args),
}))

import { POST } from '@/app/api/complete/route'

function makePostRequest(routine: string) {
  return POST(
    new Request('http://localhost/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine }),
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
    const compoundType = config.type === 'bodyweight' ? 'accessory' : config.type
    map.set(`${key}::${compoundType}`, config)
  }
  return map
}

const defaultState: WorkoutState = {
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3,
  disabledRoutines: [], program: 'BBB',
}

const pressRow: SheetRow = {
  rowIndex: 3, date: '', routine: 'Press Day', setType: 'main',
  exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5',
}
const pressHistorical: SheetRow = {
  rowIndex: 2, date: '2026-08-01', routine: 'Press Day', setType: 'main',
  exercise: 'barbell_press', targetReps: '5', targetWeight: '100', actualReps: '5',
}

describe('POST /api/complete', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset().mockResolvedValue([])
    mockUpdateCell.mockReset().mockResolvedValue(undefined)
    mockGetExerciseConfig.mockReset().mockResolvedValue(new Map())
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
    mockUpdateExerciseTrainingMax.mockReset().mockResolvedValue(undefined)
    mockGetSessions.mockReset().mockResolvedValue([])
    mockAppendSession.mockReset().mockResolvedValue(undefined)
  })

  it('returns error when no pending rows found for routine', async () => {
    mockGetAllRows.mockResolvedValue([
      { ...pressRow, date: '2026-08-14' },  // already dated — not pending
    ])
    const res = await makePostRequest('Press Day')
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(mockUpdateCell).not.toHaveBeenCalled()
  })

  it('stamps today as date on all pending rows of the routine', async () => {
    mockGetAllRows.mockResolvedValue([pressRow])
    await makePostRequest('Press Day')
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'A', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('fills empty actualReps with 0', async () => {
    mockGetAllRows.mockResolvedValue([{ ...pressRow, actualReps: '' }])
    await makePostRequest('Press Day')
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'G', '0')
  })

  it('does not touch pending rows of other routines', async () => {
    const squatRow: SheetRow = { rowIndex: 4, date: '', routine: 'Squat Day', setType: 'main', exercise: 'back_squat', targetReps: '5', targetWeight: '130', actualReps: '' }
    mockGetAllRows.mockResolvedValue([pressRow, squatRow])
    await makePostRequest('Press Day')
    expect(mockUpdateCell).not.toHaveBeenCalledWith(4, expect.anything(), expect.anything())
  })

  it('writes a session entry with the derived week and cycle', async () => {
    mockGetAllRows.mockResolvedValue([pressRow, pressHistorical])
    mockGetSessions.mockResolvedValue([
      { date: '2026-08-01', routine: 'Press Day', week: 2, cycle: 1 } satisfies SessionEntry,
    ])
    await makePostRequest('Press Day')
    expect(mockAppendSession).toHaveBeenCalledWith(
      expect.objectContaining({ routine: 'Press Day', week: 3, cycle: 1 })
    )
  })

  it('writes week 1 cycle 1 session when no prior sessions exist', async () => {
    mockGetAllRows.mockResolvedValue([pressRow])
    mockGetSessions.mockResolvedValue([])
    await makePostRequest('Press Day')
    expect(mockAppendSession).toHaveBeenCalledWith(
      expect.objectContaining({ routine: 'Press Day', week: 1, cycle: 1 })
    )
  })

  it('returns success:true with no deloadPrompt field', async () => {
    mockGetAllRows.mockResolvedValue([pressRow])
    const res = await makePostRequest('Press Day')
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data).not.toHaveProperty('deloadPrompt')
  })

  it('does not update TM when completing a mid-wave week', async () => {
    // waveLength=3, last session was week 1 → completing week 2 (not last)
    mockGetAllRows.mockResolvedValue([pressRow, pressHistorical])
    mockGetSessions.mockResolvedValue([
      { date: '2026-08-01', routine: 'Press Day', week: 1, cycle: 1 } satisfies SessionEntry,
    ])
    await makePostRequest('Press Day')
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalled()
  })

  it('increments only this routine main exercise TMs at end of wave (waveLength=3)', async () => {
    const config = makeConfig([
      ['barbell_press', { trainingMax: 200, increment: 5, type: 'main' }],
      ['back_squat', { trainingMax: 160, increment: 10, type: 'main' }],
    ])
    mockGetExerciseConfig.mockResolvedValue(config)
    mockGetAllRows.mockResolvedValue([
      pressRow,
      pressHistorical,
      // Squat belongs to a different routine
      { rowIndex: 5, date: '2026-08-01', routine: 'Squat Day', setType: 'main', exercise: 'back_squat', targetReps: '5', targetWeight: '130', actualReps: '5' },
    ])
    // waveLength=3, last session was week 2 → completing week 3 = end of wave
    mockGetSessions.mockResolvedValue([
      { date: '2026-08-01', routine: 'Press Day', week: 2, cycle: 1 } satisfies SessionEntry,
    ])
    await makePostRequest('Press Day')
    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('barbell_press', 205, 'main')
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalledWith('back_squat', expect.anything(), expect.anything())
  })

  it('increments TM at end of deload week when waveLength=4', async () => {
    mockGetWorkoutState.mockResolvedValue({ ...defaultState, cyclesBeforeIncrease: 4 })
    const config = makeConfig([['barbell_press', { trainingMax: 200, increment: 5, type: 'main' }]])
    mockGetExerciseConfig.mockResolvedValue(config)
    mockGetAllRows.mockResolvedValue([pressRow, pressHistorical])
    // Last session was week 3 → completing week 4 (deload) = end of wave
    mockGetSessions.mockResolvedValue([
      { date: '2026-08-01', routine: 'Press Day', week: 3, cycle: 1 } satisfies SessionEntry,
    ])
    await makePostRequest('Press Day')
    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('barbell_press', 205, 'main')
  })

  it('does not update accessory training maxes', async () => {
    const config = makeConfig([['db_curl', { trainingMax: 40, increment: 5, type: 'accessory' }]])
    mockGetExerciseConfig.mockResolvedValue(config)
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 3, date: '', routine: 'Press Day', setType: 'accessory', exercise: 'db_curl', targetReps: '12', targetWeight: '40', actualReps: '12' },
    ])
    await makePostRequest('Press Day')
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalled()
  })
})
