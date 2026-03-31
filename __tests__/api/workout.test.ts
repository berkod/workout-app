import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow } from '@/lib/types'

const mockGetAllRows = vi.fn()
vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
}))

import { GET } from '@/app/api/workout/[routine]/route'

function makeRequest(routine: string) {
  return GET(
    new Request(`http://localhost/api/workout/${encodeURIComponent(routine)}`),
    { params: Promise.resolve({ routine: encodeURIComponent(routine) }) }
  )
}

describe('GET /api/workout/[routine]', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
  })

  it('returns sets grouped by setType and exercise', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Day 1 – Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
      { rowIndex: 3, date: '', routine: 'Day 1 – Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '65', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'Day 1 – Press', setType: 'main', exercise: 'Overhead Press', targetReps: '5', targetWeight: '95', actualReps: '' },
      { rowIndex: 5, date: '', routine: 'Day 2 – RDL', setType: 'warm-up', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeRequest('Day 1 – Press')
    const data = await response.json()

    expect(data.routine).toBe('Day 1 – Press')
    expect(data.groups).toHaveLength(2)
    expect(data.groups[0]).toEqual({
      setType: 'warm-up',
      exercise: 'Overhead Press',
      sets: expect.arrayContaining([
        expect.objectContaining({ rowIndex: 2, targetWeight: '45' }),
        expect.objectContaining({ rowIndex: 3, targetWeight: '65' }),
      ]),
    })
    expect(data.groups[1].setType).toBe('main')
    expect(data.groups[1].sets).toHaveLength(1)
  })

  it('returns empty groups for unknown routine', async () => {
    mockGetAllRows.mockResolvedValue([])

    const response = await makeRequest('Day 99 – Fake')
    const data = await response.json()

    expect(data.groups).toEqual([])
  })
})
