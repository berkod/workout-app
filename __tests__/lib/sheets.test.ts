import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('googleapis', () => {
  const mockGet = vi.fn()
  const mockUpdate = vi.fn()
  const mockAppend = vi.fn()
  const mockBatchUpdate = vi.fn()
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
            append: mockAppend,
          },
          batchUpdate: mockBatchUpdate,
        },
      }),
    },
    __mockGet: mockGet,
    __mockUpdate: mockUpdate,
    __mockAppend: mockAppend,
    __mockBatchUpdate: mockBatchUpdate,
  }
})

import { getAllRows, updateCell, getWorkoutState, updateWorkoutState, setRoutineDisabled, setCyclesBeforeIncrease, setProgram, deleteRows } from '@/lib/sheets'

describe('sheets client', () => {
  let mockGet: ReturnType<typeof vi.fn>
  let mockUpdate: ReturnType<typeof vi.fn>
  let mockAppend: ReturnType<typeof vi.fn>
  let mockBatchUpdate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules
    const mocks = await import('googleapis') as any
    mockGet = mocks.__mockGet
    mockUpdate = mocks.__mockUpdate
    mockAppend = mocks.__mockAppend
    mockBatchUpdate = mocks.__mockBatchUpdate
    mockGet.mockReset()
    mockUpdate.mockReset()
    mockAppend.mockReset()
    mockBatchUpdate.mockReset()
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

  describe('getWorkoutState', () => {
    it('parses currentCycle, cyclesBeforeIncrease, and disabledRoutines', async () => {
      mockGet.mockResolvedValue({
        data: {
          values: [
            ['KEY', 'VALUE'],
            ['current_week', '2'],
            ['current_cycle', '3'],
            ['cycles_before_increase', '4'],
            ['disabled:Day 2 - RDL', '1'],
            ['disabled:Day 3 - Bench', '0'],
          ],
        },
      })
      const state = await getWorkoutState()
      expect(state.currentWeek).toBe(2)
      expect(state.currentCycle).toBe(3)
      expect(state.cyclesBeforeIncrease).toBe(4)
      expect(state.disabledRoutines).toEqual(['Day 2 - RDL'])
    })

    it('returns safe defaults when cycle keys are missing', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY', 'VALUE'], ['current_week', '1']] },
      })
      const state = await getWorkoutState()
      expect(state.currentCycle).toBe(1)
      expect(state.cyclesBeforeIncrease).toBe(3)
      expect(state.disabledRoutines).toEqual([])
    })

    it('parses program key as BBB', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY', 'VALUE'], ['current_week', '1'], ['program', 'BBB']] },
      })
      const state = await getWorkoutState()
      expect(state.program).toBe('BBB')
    })

    it('defaults program to FSL when key is absent', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY', 'VALUE'], ['current_week', '1']] },
      })
      const state = await getWorkoutState()
      expect(state.program).toBe('FSL')
    })
  })

  describe('updateWorkoutState', () => {
    it('updates only current_week when cycle is omitted', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['current_week'], ['current_cycle']] },
      })
      mockUpdate.mockResolvedValue({})
      await updateWorkoutState(2)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'State!B2',
        requestBody: { values: [['2']] },
      }))
    })

    it('updates both current_week and current_cycle when cycle is provided', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['current_week'], ['current_cycle']] },
      })
      mockUpdate.mockResolvedValue({})
      await updateWorkoutState(1, 3)
      expect(mockUpdate).toHaveBeenCalledTimes(2)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'State!B2',
        requestBody: { values: [['1']] },
      }))
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'State!B3',
        requestBody: { values: [['3']] },
      }))
    })
  })

  describe('setRoutineDisabled', () => {
    it('appends a new row when disabling a routine not yet in the sheet', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['current_week']] },
      })
      mockAppend.mockResolvedValue({})
      await setRoutineDisabled('Day 2 - RDL', true)
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: { values: [['disabled:Day 2 - RDL', '1']] },
      }))
    })

    it('updates existing row when toggling a routine already in the sheet', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['disabled:Day 2 - RDL']] },
      })
      mockUpdate.mockResolvedValue({})
      await setRoutineDisabled('Day 2 - RDL', false)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'State!B2',
        requestBody: { values: [['0']] },
      }))
    })

    it('does nothing when re-enabling a routine not in the sheet', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['current_week']] },
      })
      await setRoutineDisabled('Day 2 - RDL', false)
      expect(mockAppend).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('setCyclesBeforeIncrease', () => {
    it('updates the existing row', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['cycles_before_increase']] },
      })
      mockUpdate.mockResolvedValue({})
      await setCyclesBeforeIncrease(4)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'State!B2',
        requestBody: { values: [['4']] },
      }))
    })

    it('appends a new row when key is not yet in the sheet', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['current_week']] },
      })
      mockAppend.mockResolvedValue({})
      await setCyclesBeforeIncrease(3)
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: { values: [['cycles_before_increase', '3']] },
      }))
    })
  })

  describe('setProgram', () => {
    it('updates existing program row', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['program']] },
      })
      mockUpdate.mockResolvedValue({})
      await setProgram('BBB')
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'State!B2',
        requestBody: { values: [['BBB']] },
      }))
    })

    it('appends new row when program key is absent', async () => {
      mockGet.mockResolvedValue({
        data: { values: [['KEY'], ['current_week']] },
      })
      mockAppend.mockResolvedValue({})
      await setProgram('FSL')
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: { values: [['program', 'FSL']] },
      }))
    })
  })

  describe('deleteRows', () => {
    it('does nothing when given an empty array', async () => {
      await deleteRows([])
      expect(mockBatchUpdate).not.toHaveBeenCalled()
    })

    it('calls batchUpdate with DeleteDimensionRequests in descending order', async () => {
      mockBatchUpdate.mockResolvedValue({})
      await deleteRows([3, 5, 4])  // out of order — must be sorted descending
      expect(mockBatchUpdate).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: {
          requests: [
            { deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: 4, endIndex: 5 } } },
            { deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: 3, endIndex: 4 } } },
            { deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: 2, endIndex: 3 } } },
          ],
        },
      }))
      // rowIndex 5 → startIndex 4 (0-based), rowIndex 4 → startIndex 3, rowIndex 3 → startIndex 2
    })
  })
})
