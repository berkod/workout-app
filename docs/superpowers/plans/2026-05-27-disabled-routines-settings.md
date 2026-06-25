# Disabled Routines, Cycle Counter & Settings Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-routine disable toggle, N-cycle TM progression, and a Settings page replacing the BottomNav Equipment button.

**Architecture:** Disabled routines and cycle state live in the Google Sheets State tab as key-value rows. A new `getExercisesToSkip` pure helper gates TM increments. A new `/api/settings` route handles reads and writes. The Settings page replaces the BottomNav Equipment button.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, googleapis, Vitest + RTL

---

## File Map

| Action | Path |
|--------|------|
| Modify | `src/lib/types.ts` |
| Modify | `src/lib/progression.ts` |
| Modify | `src/lib/sheets.ts` |
| Modify | `src/app/api/routines/route.ts` |
| Modify | `src/app/api/complete/route.ts` |
| Modify | `src/app/api/advance-week/route.ts` |
| Modify | `src/components/BottomNav.tsx` |
| Create | `src/app/api/settings/route.ts` |
| Create | `src/app/settings/page.tsx` |
| Modify | `__tests__/lib/progression.test.ts` |
| Modify | `__tests__/lib/sheets.test.ts` |
| Modify | `__tests__/api/routines.test.ts` |
| Modify | `__tests__/api/complete.test.ts` |
| Create | `__tests__/api/advance-week.test.ts` |
| Create | `__tests__/api/settings.test.ts` |

---

## Task 1: Update WorkoutState type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update WorkoutState**

Replace the existing `WorkoutState` interface in `src/lib/types.ts`:

```typescript
export interface WorkoutState {
  currentWeek: number  // 1=week1, 2=week2, 3=week3, 4=deload
  currentCycle: number          // 1 to cyclesBeforeIncrease
  cyclesBeforeIncrease: number  // 3 or 4
  disabledRoutines: string[]    // routine names currently disabled
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: extend WorkoutState with cycle counter and disabled routines"
```

---

## Task 2: Add getExercisesToSkip to progression.ts (TDD)

**Files:**
- Modify: `src/lib/progression.ts`
- Modify: `__tests__/lib/progression.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the bottom of `__tests__/lib/progression.test.ts`:

```typescript
import { roundToNearest, generateWorkoutRows, WEEK_SPEC, getExercisesToSkip } from '@/lib/progression'

// (add this describe block at the bottom of the file)
describe('getExercisesToSkip', () => {
  function makeRow(routine: string, exercise: string): SheetRow {
    return {
      rowIndex: 1, date: '2026-01-01', routine, setType: 'main',
      exercise, targetReps: '5', targetWeight: '100', actualReps: '5',
    }
  }

  it('returns exercises that only appear in disabled routines', () => {
    const rows = [
      makeRow('Day 2 - RDL', 'rdl'),
      makeRow('Day 1 - Press', 'ohp'),
    ]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL'])
    expect(result).toEqual(new Set(['rdl']))
  })

  it('does not skip an exercise that appears in both a disabled and an active routine', () => {
    const rows = [
      makeRow('Day 2 - RDL', 'rdl'),
      makeRow('Day 1 - Press', 'rdl'),
    ]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL'])
    expect(result).toEqual(new Set())
  })

  it('returns empty set when no routines are disabled', () => {
    const rows = [makeRow('Day 1 - Press', 'ohp')]
    const result = getExercisesToSkip(rows, [])
    expect(result).toEqual(new Set())
  })

  it('normalizes exercise names to lowercase', () => {
    const rows = [makeRow('Day 2 - RDL', 'RDL')]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL'])
    expect(result.has('rdl')).toBe(true)
  })

  it('skips multiple exercises from multiple disabled routines', () => {
    const rows = [
      makeRow('Day 2 - RDL', 'rdl'),
      makeRow('Day 4 - Squat', 'squat'),
      makeRow('Day 1 - Press', 'ohp'),
    ]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL', 'Day 4 - Squat'])
    expect(result).toEqual(new Set(['rdl', 'squat']))
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run __tests__/lib/progression.test.ts
```

Expected: FAIL — `getExercisesToSkip is not a function`

- [ ] **Step 3: Implement getExercisesToSkip**

Add to the bottom of `src/lib/progression.ts`:

```typescript
export function getExercisesToSkip(
  rows: SheetRow[],
  disabledRoutines: string[]
): Set<string> {
  const disabled = new Set(disabledRoutines)
  const activeExercises = new Set<string>()
  const disabledExercises = new Set<string>()

  for (const row of rows) {
    const ex = row.exercise.toLowerCase()
    if (disabled.has(row.routine)) {
      disabledExercises.add(ex)
    } else {
      activeExercises.add(ex)
    }
  }

  return new Set([...disabledExercises].filter((ex) => !activeExercises.has(ex)))
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run __tests__/lib/progression.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/progression.ts __tests__/lib/progression.test.ts
git commit -m "feat: add getExercisesToSkip helper for disabled routine TM gating"
```

---

## Task 3: Extend sheets.ts (TDD)

**Files:**
- Modify: `src/lib/sheets.ts`
- Modify: `__tests__/lib/sheets.test.ts`

- [ ] **Step 1: Update the googleapis mock to include append**

In `__tests__/lib/sheets.test.ts`, replace the entire `vi.mock('googleapis', ...)` block at the top with:

```typescript
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
```

Replace the import and variable declarations block:

```typescript
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
```

- [ ] **Step 2: Write failing tests for getWorkoutState new fields**

Add a new `describe('getWorkoutState', ...)` block after the existing `getAllRows` describe:

```typescript
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
```

- [ ] **Step 3: Run tests to confirm failure**

```bash
npx vitest run __tests__/lib/sheets.test.ts
```

Expected: FAIL on the new describes (functions not found / missing fields)

- [ ] **Step 4: Update getWorkoutState in sheets.ts**

Replace the existing `getWorkoutState` function:

```typescript
export async function getWorkoutState(): Promise<WorkoutState> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'State!A:B',
  })
  const values = response.data.values
  if (!values || values.length <= 1) {
    return { currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: [] }
  }
  const map = new Map(values.slice(1).map((row) => [row[0], row[1]]))

  const disabledRoutines = [...map.entries()]
    .filter(([key, val]) => key.startsWith('disabled:') && val === '1')
    .map(([key]) => key.slice('disabled:'.length))

  return {
    currentWeek: Number(map.get('current_week')) || 1,
    currentCycle: Number(map.get('current_cycle')) || 1,
    cyclesBeforeIncrease: Number(map.get('cycles_before_increase')) || 3,
    disabledRoutines,
  }
}
```

- [ ] **Step 5: Update updateWorkoutState in sheets.ts**

Replace the existing `updateWorkoutState` function:

```typescript
export async function updateWorkoutState(week: number, cycle?: number): Promise<void> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'State!A:A',
  })
  const values = response.data.values
  if (!values) return

  const weekRowIndex = values.findIndex((row) => row[0] === 'current_week')
  if (weekRowIndex === -1) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `State!B${weekRowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[String(week)]] },
  })

  if (cycle !== undefined) {
    const cycleRowIndex = values.findIndex((row) => row[0] === 'current_cycle')
    if (cycleRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `State!B${cycleRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[String(cycle)]] },
      })
    }
  }
}
```

- [ ] **Step 6: Add setRoutineDisabled to sheets.ts**

Add after `updateWorkoutState`:

```typescript
export async function setRoutineDisabled(routine: string, disabled: boolean): Promise<void> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'State!A:A',
  })
  const values = response.data.values ?? []
  const key = `disabled:${routine}`
  const rowIndex = values.findIndex((row) => row[0] === key)

  if (rowIndex === -1) {
    if (!disabled) return
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'State!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[key, '1']] },
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `State!B${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[disabled ? '1' : '0']] },
    })
  }
}
```

- [ ] **Step 7: Add setCyclesBeforeIncrease to sheets.ts**

Add after `setRoutineDisabled`:

```typescript
export async function setCyclesBeforeIncrease(n: 3 | 4): Promise<void> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'State!A:A',
  })
  const values = response.data.values ?? []
  const rowIndex = values.findIndex((row) => row[0] === 'cycles_before_increase')

  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'State!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['cycles_before_increase', String(n)]] },
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `State!B${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[String(n)]] },
    })
  }
}
```

- [ ] **Step 8: Run tests to confirm pass**

```bash
npx vitest run __tests__/lib/sheets.test.ts
```

Expected: all PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/sheets.ts __tests__/lib/sheets.test.ts
git commit -m "feat: extend sheets with cycle state, disabled routines, and settings helpers"
```

---

## Task 4: Update /api/routines to filter disabled routines (TDD)

**Files:**
- Modify: `src/app/api/routines/route.ts`
- Modify: `__tests__/api/routines.test.ts`

- [ ] **Step 1: Update the mock and add failing test**

Replace the entire contents of `__tests__/api/routines.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow, WorkoutState } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockGetWorkoutState = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
}))

import { GET } from '@/app/api/routines/route'

const defaultState: WorkoutState = {
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: [],
}

describe('GET /api/routines', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
  })

  it('returns unique routines with last completed dates', async () => {
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-25', routine: 'A: Press', setType: 'warm-up', exercise: 'OHP', targetReps: '5', targetWeight: '45', actualReps: '5' },
      { rowIndex: 3, date: '2026-03-28', routine: 'A: Press', setType: 'main', exercise: 'OHP', targetReps: '5', targetWeight: '95', actualReps: '5' },
      { rowIndex: 4, date: '2026-03-26', routine: 'B: RDL', setType: 'warm-up', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '5' },
      { rowIndex: 5, date: '', routine: 'Day 3 – Bench', setType: 'warm-up', exercise: 'Bench', targetReps: '5', targetWeight: '45', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual([
      { name: 'A: Press', lastCompleted: '2026-03-28' },
      { name: 'B: RDL', lastCompleted: '2026-03-26' },
      { name: 'Day 3 – Bench', lastCompleted: null },
    ])
  })

  it('returns empty array when no data', async () => {
    mockGetAllRows.mockResolvedValue([])
    const response = await GET()
    const data = await response.json()
    expect(data).toEqual([])
  })

  it('filters out disabled routines', async () => {
    mockGetWorkoutState.mockResolvedValue({
      ...defaultState,
      disabledRoutines: ['B: RDL'],
    })
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '2026-03-28', routine: 'A: Press', setType: 'main', exercise: 'OHP', targetReps: '5', targetWeight: '95', actualReps: '5' },
      { rowIndex: 3, date: '2026-03-26', routine: 'B: RDL', setType: 'main', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '5' },
    ] satisfies SheetRow[])

    const response = await GET()
    const data = await response.json()

    expect(data).toEqual([{ name: 'A: Press', lastCompleted: '2026-03-28' }])
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/api/routines.test.ts
```

Expected: FAIL — `getWorkoutState` not in mock / filter not implemented

- [ ] **Step 3: Update routines route**

Replace the entire contents of `src/app/api/routines/route.ts`:

```typescript
import { getAllRows, getWorkoutState } from '@/lib/sheets'
import type { RoutineSummary } from '@/lib/types'

export async function GET() {
  const [rows, state] = await Promise.all([getAllRows(), getWorkoutState()])
  const disabled = new Set(state.disabledRoutines)

  const routineMap = new Map<string, string | null>()

  for (const row of rows) {
    if (disabled.has(row.routine)) continue
    const current = routineMap.get(row.routine)
    const rowDate = row.date || null

    if (current === undefined) {
      routineMap.set(row.routine, rowDate)
    } else if (rowDate && (!current || rowDate > current)) {
      routineMap.set(row.routine, rowDate)
    }
  }

  const routines: RoutineSummary[] = Array.from(routineMap.entries()).map(
    ([name, lastCompleted]) => ({ name, lastCompleted })
  )

  return Response.json(routines)
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run __tests__/api/routines.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/routines/route.ts __tests__/api/routines.test.ts
git commit -m "feat: filter disabled routines from home screen listing"
```

---

## Task 5: Update /api/complete with cycle counter and disabled TM skip (TDD)

**Files:**
- Modify: `src/app/api/complete/route.ts`
- Modify: `__tests__/api/complete.test.ts`

- [ ] **Step 1: Update existing test state mocks and add new tests**

In `__tests__/api/complete.test.ts`:

Add `WorkoutState` to imports:
```typescript
import type { ExerciseConfig, SheetRow, WorkoutState } from '@/lib/types'
```

Update the `beforeEach` default state (replace `mockGetWorkoutState.mockReset().mockResolvedValue({ currentWeek: 1 })`):
```typescript
mockGetWorkoutState.mockReset().mockResolvedValue({
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: [],
} satisfies WorkoutState)
```

Update the week-1 test's state mock (it uses the beforeEach default so no change needed there).

Update the week-3 test — replace `mockGetWorkoutState.mockResolvedValue({ currentWeek: 3 })` with:
```typescript
mockGetWorkoutState.mockResolvedValue({
  currentWeek: 3, currentCycle: 3, cyclesBeforeIncrease: 3, disabledRoutines: [],
} satisfies WorkoutState)
```

Update the week-4 test — replace `mockGetWorkoutState.mockResolvedValue({ currentWeek: 4 })` with:
```typescript
mockGetWorkoutState.mockResolvedValue({
  currentWeek: 4, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: [],
} satisfies WorkoutState)
```

Also update the week-4 expectation from `expect(mockUpdateWorkoutState).toHaveBeenCalledWith(1)` to:
```typescript
expect(mockUpdateWorkoutState).toHaveBeenCalledWith(1, 1)
```

Now add three new tests at the bottom of the `describe('POST /api/complete')` block:

```typescript
  it('silently resets to week 1 and increments cycle when week 3 completes but cycle < cyclesBeforeIncrease', async () => {
    mockGetWorkoutState.mockResolvedValue({
      currentWeek: 3, currentCycle: 2, cyclesBeforeIncrease: 3, disabledRoutines: [],
    } satisfies WorkoutState)
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '1+', targetWeight: '155', actualReps: '3' },
    ] satisfies SheetRow[])

    const res = await makePostRequest({ routine: 'Press Day' })
    const data = await res.json()

    expect(data.deloadPrompt).toBe(false)
    expect(mockUpdateWorkoutState).toHaveBeenCalledWith(1, 3)
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalled()
  })

  it('shows deload prompt when week 3 completes and currentCycle === cyclesBeforeIncrease', async () => {
    mockGetWorkoutState.mockResolvedValue({
      currentWeek: 3, currentCycle: 3, cyclesBeforeIncrease: 3, disabledRoutines: [],
    } satisfies WorkoutState)
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '1+', targetWeight: '155', actualReps: '3' },
    ] satisfies SheetRow[])

    const res = await makePostRequest({ routine: 'Press Day' })
    const data = await res.json()

    expect(data.deloadPrompt).toBe(true)
    expect(mockUpdateWorkoutState).not.toHaveBeenCalled()
  })

  it('skips TM bump for exercises that only appear in disabled routines after week 4', async () => {
    mockGetWorkoutState.mockResolvedValue({
      currentWeek: 4, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: ['Day 2 - RDL'],
    } satisfies WorkoutState)
    mockGetExerciseConfig.mockResolvedValue(makeConfig([
      ['barbell_press', { trainingMax: 165, increment: 5, type: 'main' }],
      ['rdl', { trainingMax: 225, increment: 10, type: 'main' }],
    ]))
    mockGetAllRows.mockResolvedValue([
      { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '5' },
      { rowIndex: 3, date: '2026-03-01', routine: 'Day 2 - RDL', setType: 'main', exercise: 'rdl', targetReps: '5', targetWeight: '145', actualReps: '5' },
    ] satisfies SheetRow[])

    await makePostRequest({ routine: 'Press Day' })

    expect(mockUpdateExerciseTrainingMax).toHaveBeenCalledWith('barbell_press', 170, 'main')
    expect(mockUpdateExerciseTrainingMax).not.toHaveBeenCalledWith('rdl', expect.anything(), expect.anything())
    expect(mockUpdateWorkoutState).toHaveBeenCalledWith(1, 1)
  })
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npx vitest run __tests__/api/complete.test.ts
```

Expected: existing tests MAY fail (state shape mismatch), new tests fail

- [ ] **Step 3: Rewrite complete route**

Replace the entire contents of `src/app/api/complete/route.ts`:

```typescript
import { getAllRows, updateCell, getExerciseConfig, getWorkoutState, updateWorkoutState, updateExerciseTrainingMax } from '@/lib/sheets'
import { getExercisesToSkip } from '@/lib/progression'

export async function POST(request: Request) {
  const body = await request.json()
  const { routine } = body as { routine: string }

  const [rows, exerciseConfigs, state] = await Promise.all([
    getAllRows(),
    getExerciseConfig(),
    getWorkoutState(),
  ])

  const pending = rows.filter((row) => row.routine === routine && row.date === '')
  if (pending.length === 0) {
    return Response.json({ success: false, error: 'No pending rows found' })
  }

  const today = new Date().toISOString().split('T')[0]

  const updates: Promise<void>[] = []
  for (const row of pending) {
    updates.push(updateCell(row.rowIndex, 'A', today))
    if (!row.actualReps) {
      updates.push(updateCell(row.rowIndex, 'G', '0'))
    }
  }
  await Promise.all(updates)

  // Increment accessory training maxes (bodyweight excluded)
  const accessoryExercises = [
    ...new Set(
      pending
        .filter((r) => {
          const key = r.exercise.toLowerCase()
          const config = exerciseConfigs.get(`${key}::accessory`) ?? exerciseConfigs.get(key)
          return config?.type === 'accessory'
        })
        .map((r) => r.exercise.toLowerCase())
    ),
  ]
  await Promise.all(
    accessoryExercises.map((exercise) => {
      const config = exerciseConfigs.get(`${exercise}::accessory`) ?? exerciseConfigs.get(exercise)!
      return updateExerciseTrainingMax(exercise, config.trainingMax + config.increment, 'accessory')
    })
  )

  const { currentWeek, currentCycle, cyclesBeforeIncrease, disabledRoutines } = state

  if (currentWeek < 3) {
    await updateWorkoutState(currentWeek + 1)
    return Response.json({ success: true, deloadPrompt: false })
  }

  if (currentWeek === 3) {
    if (currentCycle < cyclesBeforeIncrease) {
      await updateWorkoutState(1, currentCycle + 1)
      return Response.json({ success: true, deloadPrompt: false })
    }
    return Response.json({ success: true, deloadPrompt: true })
  }

  // Week 4 (deload) completed: bump non-disabled main TMs and reset to cycle 1 week 1
  const skipExercises = getExercisesToSkip(rows, disabledRoutines)
  const mainExercises = [...exerciseConfigs.values()].filter(
    (c) => c.type === 'main' && !skipExercises.has(c.exercise)
  )
  await Promise.all([
    ...mainExercises.map((c) => updateExerciseTrainingMax(c.exercise, c.trainingMax + c.increment, 'main')),
    updateWorkoutState(1, 1),
  ])

  return Response.json({ success: true, deloadPrompt: false })
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run __tests__/api/complete.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/complete/route.ts __tests__/api/complete.test.ts
git commit -m "feat: add N-cycle TM gating and disabled routine skip to complete route"
```

---

## Task 6: Update /api/advance-week with disabled TM skip and cycle reset (TDD)

**Files:**
- Modify: `src/app/api/advance-week/route.ts`
- Create: `__tests__/api/advance-week.test.ts`

- [ ] **Step 1: Create failing tests**

Create `__tests__/api/advance-week.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/api/advance-week.test.ts
```

Expected: FAIL — route doesn't load state/rows, updateWorkoutState called with wrong args

- [ ] **Step 3: Rewrite advance-week route**

Replace the entire contents of `src/app/api/advance-week/route.ts`:

```typescript
import { getExerciseConfig, updateExerciseTrainingMax, updateWorkoutState, getWorkoutState, getAllRows } from '@/lib/sheets'
import { getExercisesToSkip } from '@/lib/progression'

export async function POST(request: Request) {
  const { choice } = await request.json() as { choice: 'deload' | 'skip' }

  if (choice === 'deload') {
    await updateWorkoutState(4)
    return Response.json({ success: true })
  }

  const [exerciseConfigs, state, allRows] = await Promise.all([
    getExerciseConfig(),
    getWorkoutState(),
    getAllRows(),
  ])

  const skipExercises = getExercisesToSkip(allRows, state.disabledRoutines)
  const mainExercises = [...exerciseConfigs.values()].filter(
    (c) => c.type === 'main' && !skipExercises.has(c.exercise)
  )

  await Promise.all([
    ...mainExercises.map((c) => updateExerciseTrainingMax(c.exercise, c.trainingMax + c.increment, 'main')),
    updateWorkoutState(1, 1),
  ])

  return Response.json({ success: true })
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run __tests__/api/advance-week.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/advance-week/route.ts __tests__/api/advance-week.test.ts
git commit -m "feat: skip disabled exercises in advance-week and reset cycle on TM bump"
```

---

## Task 7: Create /api/settings route (TDD)

**Files:**
- Create: `src/app/api/settings/route.ts`
- Create: `__tests__/api/settings.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/settings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow, WorkoutState } from '@/lib/types'

const mockGetAllRows = vi.fn()
const mockGetWorkoutState = vi.fn()
const mockSetRoutineDisabled = vi.fn()
const mockSetCyclesBeforeIncrease = vi.fn()

vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  setRoutineDisabled: (...args: unknown[]) => mockSetRoutineDisabled(...args),
  setCyclesBeforeIncrease: (...args: unknown[]) => mockSetCyclesBeforeIncrease(...args),
}))

import { GET, PATCH } from '@/app/api/settings/route'

const defaultState: WorkoutState = {
  currentWeek: 1, currentCycle: 1, cyclesBeforeIncrease: 3, disabledRoutines: ['Day 2 - RDL'],
}

const sampleRows: SheetRow[] = [
  { rowIndex: 2, date: '2026-03-28', routine: 'Day 1 - Press', setType: 'main', exercise: 'ohp', targetReps: '5', targetWeight: '95', actualReps: '5' },
  { rowIndex: 3, date: '2026-03-26', routine: 'Day 2 - RDL', setType: 'main', exercise: 'rdl', targetReps: '5', targetWeight: '135', actualReps: '5' },
  { rowIndex: 4, date: '', routine: 'Day 3 - Bench', setType: 'main', exercise: 'bench', targetReps: '5', targetWeight: '135', actualReps: '' },
]

describe('GET /api/settings', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset().mockResolvedValue(sampleRows)
    mockGetWorkoutState.mockReset().mockResolvedValue(defaultState)
  })

  it('returns all routines (including disabled), disabled list, and cyclesBeforeIncrease', async () => {
    const res = await GET()
    const data = await res.json()

    expect(data.allRoutines).toEqual([
      { name: 'Day 1 - Press', lastCompleted: '2026-03-28' },
      { name: 'Day 2 - RDL', lastCompleted: '2026-03-26' },
      { name: 'Day 3 - Bench', lastCompleted: null },
    ])
    expect(data.disabledRoutines).toEqual(['Day 2 - RDL'])
    expect(data.cyclesBeforeIncrease).toBe(3)
  })
})

describe('PATCH /api/settings', () => {
  beforeEach(() => {
    mockSetRoutineDisabled.mockReset().mockResolvedValue(undefined)
    mockSetCyclesBeforeIncrease.mockReset().mockResolvedValue(undefined)
  })

  it('calls setRoutineDisabled when routine payload is sent', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine: 'Day 2 - RDL', disabled: true }),
      })
    )
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockSetRoutineDisabled).toHaveBeenCalledWith('Day 2 - RDL', true)
    expect(mockSetCyclesBeforeIncrease).not.toHaveBeenCalled()
  })

  it('calls setCyclesBeforeIncrease when cyclesBeforeIncrease payload is sent', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cyclesBeforeIncrease: 4 }),
      })
    )
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockSetCyclesBeforeIncrease).toHaveBeenCalledWith(4)
    expect(mockSetRoutineDisabled).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/api/settings.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create the settings route**

Create `src/app/api/settings/route.ts`:

```typescript
import { getAllRows, getWorkoutState, setRoutineDisabled, setCyclesBeforeIncrease } from '@/lib/sheets'
import type { RoutineSummary } from '@/lib/types'

export async function GET() {
  const [rows, state] = await Promise.all([getAllRows(), getWorkoutState()])

  const routineMap = new Map<string, string | null>()
  for (const row of rows) {
    const current = routineMap.get(row.routine)
    const rowDate = row.date || null
    if (current === undefined) {
      routineMap.set(row.routine, rowDate)
    } else if (rowDate && (!current || rowDate > current)) {
      routineMap.set(row.routine, rowDate)
    }
  }

  const allRoutines: RoutineSummary[] = Array.from(routineMap.entries()).map(
    ([name, lastCompleted]) => ({ name, lastCompleted })
  )

  return Response.json({
    allRoutines,
    disabledRoutines: state.disabledRoutines,
    cyclesBeforeIncrease: state.cyclesBeforeIncrease,
  })
}

export async function PATCH(request: Request) {
  const body = await request.json() as
    | { routine: string; disabled: boolean }
    | { cyclesBeforeIncrease: 3 | 4 }

  if ('routine' in body) {
    await setRoutineDisabled(body.routine, body.disabled)
  } else {
    await setCyclesBeforeIncrease(body.cyclesBeforeIncrease)
  }

  return Response.json({ success: true })
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run __tests__/api/settings.test.ts
```

Expected: all PASS

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/settings/route.ts __tests__/api/settings.test.ts
git commit -m "feat: add GET and PATCH /api/settings for routine toggles and cycle config"
```

---

## Task 8: Replace Equipment button with Settings link in BottomNav

**Files:**
- Modify: `src/components/BottomNav.tsx`

- [ ] **Step 1: Rewrite BottomNav**

Replace the entire contents of `src/components/BottomNav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname() ?? '/'

  const tabs = [
    {
      href: '/',
      label: 'Workouts',
      active: pathname === '/' || pathname.startsWith('/workout'),
      icon: (
        <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="1"  y="9"  width="3" height="6" rx="1.5" />
          <rect x="4"  y="10" width="2" height="4" rx="0.5" />
          <rect x="6"  y="11" width="12" height="2" rx="0.5" />
          <rect x="18" y="10" width="2" height="4" rx="0.5" />
          <rect x="21" y="9"  width="3" height="6" rx="1.5" />
        </svg>
      ),
    },
    {
      href: '/history',
      label: 'History',
      active: pathname.startsWith('/history'),
      icon: (
        <svg aria-hidden="true" focusable="false" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 17 8 11 13 14 21 6" />
          <line x1="3" y1="21" x2="21" y2="21" />
        </svg>
      ),
    },
    {
      href: '/settings',
      label: 'Settings',
      active: pathname.startsWith('/settings'),
      icon: (
        <svg aria-hidden="true" focusable="false" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      aria-label="Main navigation"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
      className="border-t border-fall-wheat bg-fall-cream"
    >
      <ul role="list" className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex-1">
            <Link
              href={tab.href}
              aria-current={tab.active ? 'page' : undefined}
              className={[
                'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 py-2',
                'text-xs font-medium transition-colors',
                tab.active ? 'text-fall-rust' : 'text-fall-bark-light hover:text-fall-bark',
              ].join(' ')}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat: replace Equipment nav button with Settings link"
```

---

## Task 9: Create /settings page

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Create the settings page**

Create `src/app/settings/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { saveEquipmentConfig } from '@/lib/equipment'
import type { EquipmentConfig, RoutineSummary } from '@/lib/types'

interface SettingsData {
  allRoutines: RoutineSummary[]
  disabledRoutines: string[]
  cyclesBeforeIncrease: 3 | 4
}

type SyncState = 'idle' | 'loading' | 'done'

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('idle')

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`)
      .then((res) => res.json())
      .then(setData)
  }, [])

  async function toggleRoutine(routine: string, currentlyDisabled: boolean) {
    const newDisabled = !currentlyDisabled
    setData((prev) =>
      prev
        ? {
            ...prev,
            disabledRoutines: newDisabled
              ? [...prev.disabledRoutines, routine]
              : prev.disabledRoutines.filter((r) => r !== routine),
          }
        : prev
    )
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine, disabled: newDisabled }),
    })
  }

  async function setCycles(n: 3 | 4) {
    setData((prev) => (prev ? { ...prev, cyclesBeforeIncrease: n } : prev))
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cyclesBeforeIncrease: n }),
    })
  }

  async function handleSyncEquipment() {
    if (syncState === 'loading') return
    setSyncState('loading')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/equipment`)
      if (res.ok) {
        const config: EquipmentConfig = await res.json()
        saveEquipmentConfig(config)
        setSyncState('done')
        setTimeout(() => setSyncState('idle'), 1500)
      } else {
        setSyncState('idle')
      }
    } catch {
      setSyncState('idle')
    }
  }

  if (!data) {
    return <p className="text-center text-fall-bark-light">Loading...</p>
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-fall-rust mb-3">Routines</h2>
        <ul className="space-y-2">
          {data.allRoutines.map((r) => {
            const isDisabled = data.disabledRoutines.includes(r.name)
            return (
              <li
                key={r.name}
                className="flex items-center justify-between rounded-lg border border-fall-wheat bg-white p-4 shadow-sm"
              >
                <div>
                  <p className={`text-sm font-medium ${isDisabled ? 'text-fall-bark-light' : 'text-fall-rust'}`}>
                    {r.name}
                  </p>
                  {isDisabled && (
                    <p className="text-xs text-fall-bark-light mt-0.5">
                      Training max frozen — update in sheet to resume progression
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isDisabled}
                  aria-label={`${isDisabled ? 'Enable' : 'Disable'} ${r.name}`}
                  onClick={() => toggleRoutine(r.name, isDisabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    !isDisabled ? 'bg-fall-rust' : 'bg-fall-wheat'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      !isDisabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-fall-rust mb-3">Progression</h2>
        <div className="rounded-lg border border-fall-wheat bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-fall-bark mb-3">Cycles before TM increase</p>
          <div className="flex gap-3">
            {([3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCycles(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  data.cyclesBeforeIncrease === n
                    ? 'bg-fall-rust text-white border-fall-rust'
                    : 'border-fall-wheat text-fall-bark-light'
                }`}
              >
                {n} cycles
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-fall-rust mb-3">Equipment</h2>
        <button
          type="button"
          onClick={handleSyncEquipment}
          className="w-full rounded-lg border border-fall-wheat bg-white p-4 shadow-sm text-sm font-medium text-fall-bark active:bg-fall-wheat transition-colors"
        >
          {syncState === 'done'
            ? 'Synced ✓'
            : syncState === 'loading'
            ? 'Syncing…'
            : 'Sync Equipment from Google Sheet'}
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add Settings page with routine toggles, cycle selector, and equipment sync"
```

---

## Done

All tasks complete. The State sheet needs two new rows added manually before using:
- `current_cycle | 1`
- `cycles_before_increase | 3`

The app will default to `currentCycle: 1` and `cyclesBeforeIncrease: 3` if these rows are missing, so the app will work safely before they are added. `disabled:*` rows are appended automatically by the toggle.
