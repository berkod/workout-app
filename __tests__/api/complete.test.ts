import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockUpdateCell = vi.fn()
vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  updateCell: (...args: unknown[]) => mockUpdateCell(...args),
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

describe('POST /api/complete', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockUpdateCell.mockReset()
    mockUpdateCell.mockResolvedValue(undefined)
  })

  it('fills empty actualReps with 0 and sets date for all rows in routine', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Day 1 – Press', setType: 'warm-up', exercise: 'OHP', targetReps: '5', targetWeight: '45', actualReps: '5' },
      { rowIndex: 3, date: '', routine: 'Day 1 – Press', setType: 'main', exercise: 'OHP', targetReps: '5', targetWeight: '95', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'Day 2 – RDL', setType: 'warm-up', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makePostRequest({ routine: 'Day 1 – Press' })
    const data = await response.json()

    expect(data).toEqual({ success: true, rowsUpdated: 2 })

    // Row 2: has actualReps, only set date (column A)
    expect(mockUpdateCell).toHaveBeenCalledWith(2, 'A', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))

    // Row 3: empty actualReps, set to 0 (column G) and set date (column A)
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'G', '0')
    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'A', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))

    // Row 4 (different routine): should NOT be updated
    const row4Calls = mockUpdateCell.mock.calls.filter(
      (call: unknown[]) => call[0] === 4
    )
    expect(row4Calls).toHaveLength(0)
  })
})
