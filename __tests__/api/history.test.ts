import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAllRows = vi.fn()
const mockGetExerciseConfig = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getExerciseConfig: (...args: unknown[]) => mockGetExerciseConfig(...args),
}))

import { GET } from '@/app/api/history/route'

describe('GET /api/history', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset().mockResolvedValue([])
    mockGetExerciseConfig.mockReset().mockResolvedValue(new Map())
  })

  it('excludes bodyweight exercises from the response', async () => {
    const config = new Map()
    config.set('pullups::accessory', { exercise: 'pullups', humanReadable: 'Pull-ups', trainingMax: 0, increment: 0, type: 'bodyweight', roundTo: 0, equipment: 'bodyweight' })
    config.set('pullups', { exercise: 'pullups', humanReadable: 'Pull-ups', trainingMax: 0, increment: 0, type: 'bodyweight', roundTo: 0, equipment: 'bodyweight' })
    config.set('barbell_press::main', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 200, increment: 5, type: 'main', roundTo: 2.5, equipment: 'barbell' })
    config.set('barbell_press', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 200, increment: 5, type: 'main', roundTo: 2.5, equipment: 'barbell' })
    mockGetExerciseConfig.mockResolvedValue(config)

    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-08-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '5' },
      { rowIndex: 3, date: '2026-08-01', routine: 'Press Day', setType: 'accessory', exercise: 'pullups', targetReps: '8', targetWeight: 'BW', actualReps: '8' },
    ])

    const res = await GET()
    const data = await res.json()

    const exercises = data.map((e: { exercise: string }) => e.exercise)
    expect(exercises).toContain('barbell_press')
    expect(exercises).not.toContain('pullups')
  })
})
