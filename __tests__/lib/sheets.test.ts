import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('googleapis', () => {
  const mockGet = vi.fn()
  const mockUpdate = vi.fn()
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn().mockImplementation(function () { return {} }),
      },
      sheets: vi.fn().mockReturnValue({
        spreadsheets: {
          values: {
            get: mockGet,
            update: mockUpdate,
          },
        },
      }),
    },
    __mockGet: mockGet,
    __mockUpdate: mockUpdate,
  }
})

import { getAllRows, updateCell } from '@/lib/sheets'

describe('sheets client', () => {
  let mockGet: ReturnType<typeof vi.fn>
  let mockUpdate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules
    const mocks = await import('googleapis') as any
    mockGet = mocks.__mockGet
    mockUpdate = mocks.__mockUpdate
    mockGet.mockReset()
    mockUpdate.mockReset()
  })

  describe('getAllRows', () => {
    it('returns parsed rows with row indices', async () => {
      mockGet.mockResolvedValue({
        data: {
          values: [
            ['DATE', 'ROUTINE', 'SET TYPE', 'EXERCISE', 'TARGET REPS', 'TARGET WEIGHT', 'ACTUAL REPS'],
            ['2026-03-28', 'Day 1 – Press', 'warm-up', 'Overhead Press', '5', '45', '5'],
            ['2026-03-28', 'Day 1 – Press', 'main', 'Overhead Press', '5', '95', ''],
          ],
        },
      })

      const rows = await getAllRows()

      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({
        rowIndex: 2,
        date: '2026-03-28',
        routine: 'Day 1 – Press',
        setType: 'warm-up',
        exercise: 'Overhead Press',
        targetReps: '5',
        targetWeight: '45',
        actualReps: '5',
      })
      expect(rows[1].rowIndex).toBe(3)
      expect(rows[1].actualReps).toBe('')
    })

    it('returns empty array when sheet has only headers', async () => {
      mockGet.mockResolvedValue({
        data: {
          values: [
            ['DATE', 'ROUTINE', 'SET TYPE', 'EXERCISE', 'TARGET REPS', 'TARGET WEIGHT', 'ACTUAL REPS'],
          ],
        },
      })

      const rows = await getAllRows()
      expect(rows).toEqual([])
    })
  })

  describe('updateCell', () => {
    it('updates a specific cell by row and column letter', async () => {
      mockUpdate.mockResolvedValue({})

      await updateCell(3, 'G', '8')

      expect(mockUpdate).toHaveBeenCalledWith({
        spreadsheetId: expect.any(String),
        range: 'Sheet1!G3',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['8']] },
      })
    })
  })
})
