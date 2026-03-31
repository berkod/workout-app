import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateCell = vi.fn()
vi.mock('@/lib/sheets', () => ({
  updateCell: (...args: unknown[]) => mockUpdateCell(...args),
}))

import { PATCH } from '@/app/api/sets/route'

function makePatchRequest(body: object) {
  return PATCH(
    new Request('http://localhost/api/sets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('PATCH /api/sets', () => {
  beforeEach(() => {
    mockUpdateCell.mockReset()
    mockUpdateCell.mockResolvedValue(undefined)
  })

  it('updates actualReps cell at correct row and column G', async () => {
    const response = await makePatchRequest({
      rowIndex: 5,
      column: 'actualReps',
      value: '8',
    })
    const data = await response.json()

    expect(mockUpdateCell).toHaveBeenCalledWith(5, 'G', '8')
    expect(data).toEqual({ success: true })
  })

  it('updates targetWeight cell at column F', async () => {
    const response = await makePatchRequest({
      rowIndex: 3,
      column: 'targetWeight',
      value: '100',
    })

    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'F', '100')
    expect(response.status).toBe(200)
  })

  it('updates targetReps cell at column E', async () => {
    const response = await makePatchRequest({
      rowIndex: 3,
      column: 'targetReps',
      value: '3',
    })

    expect(mockUpdateCell).toHaveBeenCalledWith(3, 'E', '3')
  })

  it('rejects invalid column names', async () => {
    const response = await makePatchRequest({
      rowIndex: 3,
      column: 'routine',
      value: 'hacked',
    })

    expect(response.status).toBe(400)
    expect(mockUpdateCell).not.toHaveBeenCalled()
  })
})
