import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('googleapis', () => {
  const mockGet = vi.fn()
  const mockUpdate = vi.fn()
  const mockAppend = vi.fn()
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
        },
      }),
    },
    __mockGet: mockGet,
    __mockUpdate: mockUpdate,
    __mockAppend: mockAppend,
  }
})

import { getAllRows, updateCell, getWorkoutState, updateWorkoutState, setRoutineDisabled, setCyclesBeforeIncrease } from '@/lib/sheets'

describe('sheets client', () => {
  let mockGet: ReturnType<typeof vi.fn>
  let mockUpdate: ReturnType<typeof vi.fn>
  let mockAppend: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules
    const mocks = await import('googleapis') as any
    mockGet = mocks.__mockGet
    mockUpdate = mocks.__mockUpdate
    mockAppend = mocks.__mockAppend
    mockGet.mockReset()
    mockUpdate.mockReset()
    mockAppend.mockReset()
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
})
