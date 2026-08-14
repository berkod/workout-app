# Per-Routine Week Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken global week counter with per-routine week/cycle tracking via a Sessions Google Sheet tab, fixing incorrect main lift weights and enabling correct per-week accessory progression.

**Architecture:** A new `Sessions` tab (already created and seeded) stores one row per completed session with date/routine/week/cycle. Week and cycle are derived per-routine from Sessions history using `deriveNextWeekCycle()`. The complete route writes a session on each completion and increments only that routine's main lift TMs when the wave ends. The deload modal is removed — week 4 is just another generated week when waveLength=4.

**Tech Stack:** Next.js 16 App Router, Google Sheets API (googleapis), Vitest + React Testing Library, TypeScript

## Global Constraints

- All new functions follow TDD: failing test first, then implementation
- Run `npx vitest run` after every commit to confirm green suite
- Never mock `updateWorkoutState` in new tests — that function is removed from the complete route
- `cyclesBeforeIncrease` field in State now means "weeks per wave" (3 or 4), not "cycles before TM bump"
- Sessions tab columns: `Date | Routine | Week | Cycle` (header already written by seed migration)
- The `WEEK_SPEC` in `progression.ts` already has correct percentages for weeks 1–4 including deload

---

## File Map

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `SessionEntry`; add `week`/`cycle` to `WorkoutData` |
| `src/lib/sheets.ts` | Add `getSessions`, `appendSession` |
| `src/lib/progression.ts` | Add `deriveNextWeekCycle`; update `generateWorkoutRows` signature + accessory logic |
| `src/app/api/workout/[routine]/route.ts` | Derive week/cycle from Sessions; include in response |
| `src/app/api/complete/route.ts` | Full rewrite: sessions, per-routine TM, remove deload prompt + accessory TM updates |
| `src/app/api/advance-week/route.ts` | **Delete** |
| `src/app/workout/[routine]/page.tsx` | Add week/cycle subtitle; remove deload modal |
| `src/app/settings/page.tsx` | Change "cycles" labels to "weeks" |
| `src/app/api/history/route.ts` | Filter out bodyweight exercises |
| `__tests__/lib/sheets.test.ts` | Add `getSessions`/`appendSession` tests |
| `__tests__/lib/progression.test.ts` | Add `deriveNextWeekCycle` tests; update `generateWorkoutRows` accessory tests |
| `__tests__/api/workout.test.ts` | Add `mockGetSessions`; assert `week`/`cycle` in responses |
| `__tests__/api/complete.test.ts` | Full rewrite matching new route logic |
| `__tests__/api/advance-week.test.ts` | **Delete** |
| `__tests__/pages/workout.test.tsx` | Assert week/cycle subtitle; remove deload modal tests |

---

### Task 1: SessionEntry type + getSessions / appendSession

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/sheets.ts`
- Modify: `__tests__/lib/sheets.test.ts`

**Interfaces:**
- Produces: `SessionEntry { date: string; routine: string; week: number; cycle: number }`
- Produces: `getSessions(): Promise<SessionEntry[]>` — reads Sessions tab, returns `[]` on any error
- Produces: `appendSession(entry: SessionEntry): Promise<void>` — appends one row to Sessions tab

- [ ] **Step 1: Add `SessionEntry` to types.ts**

In `src/lib/types.ts`, add after the `WorkoutState` interface:

```typescript
export interface SessionEntry {
  date: string    // ISO date e.g. '2026-08-14'
  routine: string
  week: number    // 1–4
  cycle: number   // 1+
}
```

- [ ] **Step 2: Write failing tests for `getSessions` and `appendSession`**

Add to the bottom of `__tests__/lib/sheets.test.ts` (inside the top-level `describe('sheets client', ...)` block, after the last `describe` in that file):

```typescript
import { getSessions, appendSession } from '@/lib/sheets'
import type { SessionEntry } from '@/lib/types'

describe('getSessions', () => {
  it('returns empty array when Sessions tab is missing or empty', async () => {
    mockGet.mockRejectedValueOnce(new Error('Unable to parse range: Sessions!A:D'))
    const result = await getSessions()
    expect(result).toEqual([])
  })

  it('returns empty array when sheet has only a header row', async () => {
    mockGet.mockResolvedValueOnce({
      data: { values: [['Date', 'Routine', 'Week', 'Cycle']] },
    })
    const result = await getSessions()
    expect(result).toEqual([])
  })

  it('parses and returns session entries skipping header', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        values: [
          ['Date', 'Routine', 'Week', 'Cycle'],
          ['2026-08-01', 'Day 1 – Press BBB', '2', '1'],
          ['2026-08-03', 'Day 2 – Deadlift BBB', '1', '1'],
        ],
      },
    })
    const result = await getSessions()
    expect(result).toEqual<SessionEntry[]>([
      { date: '2026-08-01', routine: 'Day 1 – Press BBB', week: 2, cycle: 1 },
      { date: '2026-08-03', routine: 'Day 2 – Deadlift BBB', week: 1, cycle: 1 },
    ])
  })
})

describe('appendSession', () => {
  it('appends a session row to the Sessions tab', async () => {
    mockAppend.mockResolvedValueOnce({ data: {} })
    await appendSession({ date: '2026-08-14', routine: 'Day 1 – Press BBB', week: 3, cycle: 1 })
    expect(mockAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        range: 'Sessions!A:D',
        requestBody: {
          values: [['2026-08-14', 'Day 1 – Press BBB', '3', '1']],
        },
      })
    )
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run __tests__/lib/sheets.test.ts
```

Expected: `getSessions` and `appendSession` not defined.

- [ ] **Step 4: Implement `getSessions` and `appendSession` in sheets.ts**

Add at the bottom of `src/lib/sheets.ts`, before the last closing brace:

```typescript
export async function getSessions(): Promise<SessionEntry[]> {
  try {
    const sheets = getSheets()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sessions!A:D',
    })
    const values = response.data.values
    if (!values || values.length <= 1) return []
    return values.slice(1).map((row) => ({
      date: row[0] || '',
      routine: row[1] || '',
      week: Number(row[2]) || 1,
      cycle: Number(row[3]) || 1,
    }))
  } catch {
    return []
  }
}

export async function appendSession(entry: SessionEntry): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sessions!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[entry.date, entry.routine, String(entry.week), String(entry.cycle)]],
    },
  })
}
```

Add `SessionEntry` to the import at the top of `sheets.ts`:
```typescript
import type { EquipmentConfig, ExerciseConfig, PlateEntry, Program, SessionEntry, SheetRow, WorkoutState } from './types'
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run __tests__/lib/sheets.test.ts
```

Expected: all pass.

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/sheets.ts __tests__/lib/sheets.test.ts
git commit -m "feat: add SessionEntry type and getSessions/appendSession sheet functions"
```

---

### Task 2: deriveNextWeekCycle + generateWorkoutRows accessory update

**Files:**
- Modify: `src/lib/progression.ts`
- Modify: `__tests__/lib/progression.test.ts`

**Interfaces:**
- Consumes: `SessionEntry` from Task 1
- Produces: `deriveNextWeekCycle(sessions: SessionEntry[], routine: string, waveLength: number): { week: number; cycle: number }`
- Produces: `generateWorkoutRows(routine, allHistoricalRows, exerciseConfigs, week, program, sessions?, currentCycle?)` — new optional params; existing call sites with 5 args continue to work (backward compat via defaults)

- [ ] **Step 1: Write failing tests for `deriveNextWeekCycle`**

Add a new `describe` block at the bottom of `__tests__/lib/progression.test.ts`:

```typescript
import { deriveNextWeekCycle } from '@/lib/progression'
import type { SessionEntry } from '@/lib/types'

describe('deriveNextWeekCycle', () => {
  it('returns week 1 cycle 1 when no sessions exist for the routine', () => {
    expect(deriveNextWeekCycle([], 'Day 1', 3)).toEqual({ week: 1, cycle: 1 })
  })

  it('ignores sessions for other routines', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 2', week: 3, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 1, cycle: 1 })
  })

  it('advances week within wave (waveLength=3)', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 1', week: 1, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 2, cycle: 1 })
  })

  it('rolls to week 1 and bumps cycle after last week of wave (waveLength=3)', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Day 1', week: 3, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 1, cycle: 2 })
  })

  it('advances to week 4 (deload) when waveLength=4 and last was week 3', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Day 1', week: 3, cycle: 2 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 4)).toEqual({ week: 4, cycle: 2 })
  })

  it('rolls to week 1 and bumps cycle after deload (waveLength=4)', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Day 1', week: 4, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 4)).toEqual({ week: 1, cycle: 2 })
  })

  it('uses the most recent session when multiple exist', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 1', week: 1, cycle: 1 },
      { date: '2026-08-08', routine: 'Day 1', week: 2, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 3, cycle: 1 })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/lib/progression.test.ts 2>&1 | grep -E 'FAIL|deriveNextWeekCycle'
```

Expected: `deriveNextWeekCycle is not a function`.

- [ ] **Step 3: Implement `deriveNextWeekCycle` in progression.ts**

Add at the top of `src/lib/progression.ts`, after the existing imports:

```typescript
import type { ExerciseConfig, Program, SessionEntry, SheetRow } from './types'
```

Add this function before `generateWorkoutRows`:

```typescript
export function deriveNextWeekCycle(
  sessions: SessionEntry[],
  routine: string,
  waveLength: number,
): { week: number; cycle: number } {
  const routineSessions = sessions
    .filter((s) => s.routine === routine)
    .sort((a, b) => b.date.localeCompare(a.date))
  const last = routineSessions[0]
  if (!last) return { week: 1, cycle: 1 }
  if (last.week < waveLength) return { week: last.week + 1, cycle: last.cycle }
  return { week: 1, cycle: last.cycle + 1 }
}
```

- [ ] **Step 4: Run to confirm deriveNextWeekCycle tests pass**

```bash
npx vitest run __tests__/lib/progression.test.ts 2>&1 | grep -E 'PASS|FAIL|deriveNextWeekCycle'
```

- [ ] **Step 5: Update generateWorkoutRows signature and accessory logic**

In `src/lib/progression.ts`, change the `generateWorkoutRows` signature from:

```typescript
export function generateWorkoutRows(
  routine: string,
  allHistoricalRows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>,
  week: Week,
  program: Program = 'FSL',
): Omit<SheetRow, 'rowIndex'>[]
```

to:

```typescript
export function generateWorkoutRows(
  routine: string,
  allHistoricalRows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>,
  week: Week,
  program: Program = 'FSL',
  sessions: SessionEntry[] = [],
  currentCycle: number = 1,
): Omit<SheetRow, 'rowIndex'>[]
```

Then replace the accessory weight calculation block (the lines that compute `weight` for the accessory case, currently ending with `String(config.trainingMax)`). Find the section in Pass 2 (accessory sets) that reads:

```typescript
    const numSets = latestSets.length || 1
    const reps = latestSets[0]?.targetReps ?? '10'
    const prevWeight = latestSets[0]?.targetWeight
    const weight = config.type === 'bodyweight'
      ? 'BW'
      : prevWeight != null
        ? String(roundToNearest(Number(prevWeight) + 5, config.roundTo ?? 2.5))
        : String(config.trainingMax)
```

Replace the entire block from `const historicalSets = ...` through the `weight` line with:

```typescript
    // Find previous-week sessions for this routine (earlier cycle or earlier week in same cycle)
    const prevWeekSessions = sessions
      .filter(
        (s) =>
          s.routine === routine &&
          (s.cycle < currentCycle || (s.cycle === currentCycle && s.week < week)),
      )
      .sort((a, b) => b.date.localeCompare(a.date))

    let prevWeight: string | undefined

    if (sessions.length > 0) {
      // Sessions data available: look up rows from most recent prior-week session
      const prevWeekDate = prevWeekSessions[0]?.date
      if (prevWeekDate) {
        const prevWeekSets = allHistoricalRows.filter(
          (r) =>
            r.setType.toLowerCase() === 'accessory' &&
            r.exercise === exercise &&
            r.date === prevWeekDate,
        )
        prevWeight = prevWeekSets[0]?.targetWeight
      }
      // No prior-week session → prevWeight stays undefined → falls back to TM below
    } else {
      // No sessions data: backward compat — use most recent completed session
      const historicalSets = allHistoricalRows.filter(
        (r) => r.setType.toLowerCase() === 'accessory' && r.exercise === exercise && r.date !== '',
      )
      const latestDate = historicalSets.reduce((max, r) => (r.date > max ? r.date : max), '')
      const latestSets = historicalSets.filter((r) => r.date === latestDate)
      prevWeight = latestSets[0]?.targetWeight
    }

    // Recompute numSets and reps from most recent history regardless of week
    const recentAccessorySets = allHistoricalRows
      .filter(
        (r) => r.setType.toLowerCase() === 'accessory' && r.exercise === exercise && r.date !== '',
      )
    const latestDate = recentAccessorySets.reduce((max, r) => (r.date > max ? r.date : max), '')
    const latestSets = recentAccessorySets.filter((r) => r.date === latestDate)
    const numSets = latestSets.length || 1
    const reps = latestSets[0]?.targetReps ?? '10'

    const weight =
      config.type === 'bodyweight'
        ? 'BW'
        : prevWeight !== undefined
          ? String(roundToNearest(Number(prevWeight) + 5, config.roundTo ?? 2.5))
          : String(config.trainingMax)
```

- [ ] **Step 6: Add accessory session-aware tests**

Add a new describe block in `__tests__/lib/progression.test.ts` after the existing accessory tests:

```typescript
describe('generateWorkoutRows — accessory per-week sessions', () => {
  it('uses prior-week session targetWeight + 5 when sessions data available', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Press Day', week: 2, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // Generating week 3, cycle 1 → prior week = week 2, cycle 1 → date 2026-08-01 → weight 50+5
    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', sessions, 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('55')
  })

  it('falls back to trainingMax when sessions exist but no prior-week session for this routine', () => {
    // The only session IS week 3 cycle 1 (same as what we are generating), so no prior-week
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Press Day', week: 3, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 45, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', sessions, 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('45')  // TM fallback
  })

  it('uses prior-cycle session when current week 1 of new cycle', () => {
    // Last session was week 3, cycle 1. Now generating week 1, cycle 2.
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Press Day', week: 3, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-14', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '60', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // Generating week 1, cycle 2 → prior = cycle 1 (any week) → week 3 date → weight 60+5
    const rows = generateWorkoutRows('Press Day', historical, configs, 1, 'BBB', sessions, 2)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('65')
  })

  it('backward compat: no sessions → uses most recent historical + 5', () => {
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // sessions=[] → backward compat path
    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', [], 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('55')  // 50 + 5
  })
})
```

- [ ] **Step 7: Run full progression tests**

```bash
npx vitest run __tests__/lib/progression.test.ts
```

Expected: all pass.

- [ ] **Step 8: Run full suite**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/progression.ts __tests__/lib/progression.test.ts
git commit -m "feat: add deriveNextWeekCycle and per-week accessory progression"
```

---

### Task 3: WorkoutData week/cycle fields + workout API

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/workout/[routine]/route.ts`
- Modify: `__tests__/api/workout.test.ts`

**Interfaces:**
- Consumes: `getSessions`, `deriveNextWeekCycle`, updated `generateWorkoutRows` from Tasks 1–2
- Produces: `WorkoutData.week: number`, `WorkoutData.cycle: number` in all GET/POST responses

- [ ] **Step 1: Add week and cycle to WorkoutData type**

In `src/lib/types.ts`, update `WorkoutData`:

```typescript
export interface WorkoutData {
  routine: string
  groups: SetGroup[]
  isPreview: boolean
  week: number
  cycle: number
}
```

- [ ] **Step 2: Write failing tests for week/cycle in workout API**

In `__tests__/api/workout.test.ts`:

Add `mockGetSessions` alongside the existing mocks:

```typescript
const mockGetSessions = vi.fn()
```

Add `getSessions` to the `vi.mock('@/lib/sheets', ...)` factory:

```typescript
vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
  getExerciseConfig: (...args: unknown[]) => mockGetExerciseConfig(...args),
  getWorkoutState: (...args: unknown[]) => mockGetWorkoutState(...args),
  appendRows: (...args: unknown[]) => mockAppendRows(...args),
  getSessions: (...args: unknown[]) => mockGetSessions(...args),
}))
```

In the `GET` `beforeEach`, add:

```typescript
mockGetSessions.mockResolvedValue([])
```

In the `POST` `beforeEach`, add:

```typescript
mockGetSessions.mockReset().mockResolvedValue([])
```

Add these tests to the GET describe block:

```typescript
it('returns week:1 cycle:1 when no sessions exist', async () => {
  mockGetAllRows.mockResolvedValue([
    { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
  ] satisfies SheetRow[])
  mockGetSessions.mockResolvedValue([])

  const response = await makeGET('Press Day')
  const data = await response.json()

  expect(data.week).toBe(1)
  expect(data.cycle).toBe(1)
})

it('derives week and cycle from sessions for pending-row response', async () => {
  mockGetAllRows.mockResolvedValue([
    { rowIndex: 2, date: '', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '130', actualReps: '' },
  ] satisfies SheetRow[])
  mockGetSessions.mockResolvedValue([
    { date: '2026-08-01', routine: 'Press Day', week: 2, cycle: 1 },
  ])

  const response = await makeGET('Press Day')
  const data = await response.json()

  expect(data.week).toBe(3)
  expect(data.cycle).toBe(1)
})

it('preview response includes derived week and cycle', async () => {
  const config = new Map()
  config.set('barbell_press::main', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 100, increment: 5, type: 'main', roundTo: 5 })
  config.set('barbell_press', { exercise: 'barbell_press', humanReadable: 'Barbell Press', trainingMax: 100, increment: 5, type: 'main', roundTo: 5 })
  mockGetExerciseConfig.mockResolvedValue(config)
  mockGetAllRows.mockResolvedValue([
    { rowIndex: 2, date: '2026-08-01', routine: 'Press Day', setType: 'main', exercise: 'barbell_press', targetReps: '5', targetWeight: '65', actualReps: '5' },
  ] satisfies SheetRow[])
  mockGetSessions.mockResolvedValue([
    { date: '2026-08-01', routine: 'Press Day', week: 1, cycle: 1 },
  ])

  const response = await makeGET('Press Day')
  const data = await response.json()

  expect(data.isPreview).toBe(true)
  expect(data.week).toBe(2)
  expect(data.cycle).toBe(1)
})
```

- [ ] **Step 3: Run to confirm new tests fail**

```bash
npx vitest run __tests__/api/workout.test.ts 2>&1 | grep FAIL
```

Expected: failures about `week`/`cycle` undefined and `getSessions` not in mock.

- [ ] **Step 4: Update the workout API route**

Replace `src/app/api/workout/[routine]/route.ts` with the following. Read the current file first, then apply these changes:

Add `getSessions` to the imports from `@/lib/sheets`:
```typescript
import { getAllRows, appendRows, getExerciseConfig, getWorkoutState, getSessions } from '@/lib/sheets'
```

Add `deriveNextWeekCycle` to the imports from `@/lib/progression`:
```typescript
import { generateWorkoutRows, deriveNextWeekCycle } from '@/lib/progression'
```

Add `SessionEntry` to type imports:
```typescript
import type { WorkoutData, SetGroup, SheetRow, Week, EditableColumn, SessionEntry } from '@/lib/types'
```

Update `buildWorkoutData` to accept and pass through `week` and `cycle`:

```typescript
function buildWorkoutData(
  routine: string,
  rows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>,
  week: number = 1,
  cycle: number = 1,
): WorkoutData {
  // ... existing grouping logic unchanged ...
  return { routine, groups, isPreview: false, week, cycle }
}
```

In the GET handler, after loading `state`, add:

```typescript
const sessions = await getSessions()
const { week, cycle } = deriveNextWeekCycle(sessions, decodedRoutine, state.cyclesBeforeIncrease)
```

Update the pending-rows early return:
```typescript
if (pending.length > 0) {
  return Response.json(buildWorkoutData(decodedRoutine, pending, exerciseConfigs, week, cycle))
}
```

Update the preview generation to pass sessions and cycle:
```typescript
const previewRows = generateWorkoutRows(decodedRoutine, historical, exerciseConfigs, week as Week, state.program, sessions, cycle)
  .map((r, i): SheetRow => ({ ...r, rowIndex: -(i + 1), date: '', actualReps: '' }))
const preview = buildWorkoutData(decodedRoutine, previewRows, exerciseConfigs, week, cycle)
return Response.json({ ...preview, isPreview: true })
```

Update the empty-history return:
```typescript
return Response.json({ routine: decodedRoutine, groups: [], isPreview: false, week, cycle })
```

Apply identical changes to the POST handler (same `sessions`/`week`/`cycle` derivation and pass-through).

- [ ] **Step 5: Run workout API tests**

```bash
npx vitest run __tests__/api/workout.test.ts
```

Expected: all pass.

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all pass (TypeScript compile errors on workout page will surface — check `src/app/workout/[routine]/page.tsx` uses `workout.isPreview`, not `week`/`cycle` yet, so no errors expected yet).

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/app/api/workout/[routine]/route.ts __tests__/api/workout.test.ts
git commit -m "feat: include per-routine week and cycle in workout API response"
```

---

### Task 4: Complete route rewrite + delete advance-week

**Files:**
- Modify: `src/app/api/complete/route.ts`
- Modify: `__tests__/api/complete.test.ts`
- Delete: `src/app/api/advance-week/route.ts`
- Delete: `__tests__/api/advance-week.test.ts`

**Interfaces:**
- Consumes: `getSessions`, `appendSession` (Task 1), `deriveNextWeekCycle` (Task 2)
- Complete route no longer calls `updateWorkoutState` or updates accessory TMs
- Response: `{ success: true }` only — no `deloadPrompt` field

- [ ] **Step 1: Rewrite `__tests__/api/complete.test.ts`**

Replace the entire file:

```typescript
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
```

- [ ] **Step 2: Run to confirm failures**

```bash
npx vitest run __tests__/api/complete.test.ts 2>&1 | grep -E 'FAIL|pass'
```

Expected: multiple failures (old route shape).

- [ ] **Step 3: Rewrite the complete route**

Replace `src/app/api/complete/route.ts` entirely:

```typescript
import { getAllRows, updateCell, getExerciseConfig, getWorkoutState, updateExerciseTrainingMax, getSessions, appendSession } from '@/lib/sheets'
import { deriveNextWeekCycle } from '@/lib/progression'

export async function POST(request: Request) {
  const body = await request.json()
  const { routine } = body as { routine: string }

  const [rows, exerciseConfigs, state, sessions] = await Promise.all([
    getAllRows(),
    getExerciseConfig(),
    getWorkoutState(),
    getSessions(),
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

  const waveLength = state.cyclesBeforeIncrease
  const { week, cycle } = deriveNextWeekCycle(sessions, routine, waveLength)

  await appendSession({ date: today, routine, week, cycle })

  // Increment TMs for this routine's main exercises only at the end of a wave
  if (week === waveLength) {
    const mainExercisesInRoutine = [
      ...new Set(
        rows
          .filter((r) => r.routine === routine && r.setType.toLowerCase() === 'main' && r.date !== '')
          .map((r) => r.exercise.toLowerCase()),
      ),
    ]
    await Promise.all(
      mainExercisesInRoutine.map((exercise) => {
        const config = exerciseConfigs.get(`${exercise}::main`) ?? exerciseConfigs.get(exercise)
        if (!config || config.type !== 'main') return Promise.resolve()
        return updateExerciseTrainingMax(exercise, config.trainingMax + config.increment, 'main')
      }),
    )
  }

  return Response.json({ success: true })
}
```

- [ ] **Step 4: Run complete route tests**

```bash
npx vitest run __tests__/api/complete.test.ts
```

Expected: all pass.

- [ ] **Step 5: Delete advance-week route and test**

```bash
rm src/app/api/advance-week/route.ts
rm __tests__/api/advance-week.test.ts
```

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: all pass (one fewer test file).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/complete/route.ts __tests__/api/complete.test.ts
git rm src/app/api/advance-week/route.ts __tests__/api/advance-week.test.ts
git commit -m "feat: per-routine TM increment and session logging in complete route; remove advance-week"
```

---

### Task 5: Workout page — week/cycle heading + remove deload modal

**Files:**
- Modify: `src/app/workout/[routine]/page.tsx`
- Modify: `__tests__/pages/workout.test.tsx`

**Interfaces:**
- Consumes: `WorkoutData.week` and `WorkoutData.cycle` from Task 3
- No longer calls POST `/api/advance-week`

- [ ] **Step 1: Write failing tests for heading and modal removal**

In `__tests__/pages/workout.test.tsx`, update `mockWorkoutData` to include week/cycle:

```typescript
const mockWorkoutData: WorkoutData = {
  routine: 'A: Press',
  isPreview: false,
  week: 2,
  cycle: 1,
  groups: [ /* existing groups unchanged */ ],
}
```

Update `mockPreviewData`:
```typescript
const mockPreviewData: WorkoutData = {
  routine: 'A: Press',
  isPreview: true,
  week: 3,
  cycle: 1,
  groups: [ /* existing groups unchanged */ ],
}
```

Add these tests:

```typescript
it('displays week and cycle as subtitle', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => mockWorkoutData })
  render(<WorkoutPage />)
  await screen.findByText('A: Press')
  expect(screen.getByText('Week 2 · Cycle 1')).toBeInTheDocument()
})

it('does not render a deload modal', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => mockWorkoutData })
  render(<WorkoutPage />)
  await screen.findByText('A: Press')
  expect(screen.queryByText(/3 Weeks Complete/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/Do Deload Week/i)).not.toBeInTheDocument()
})
```

Remove any existing test that asserts `deloadPrompt` behavior or the deload modal.

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npx vitest run __tests__/pages/workout.test.tsx 2>&1 | grep FAIL
```

- [ ] **Step 3: Update the workout page**

In `src/app/workout/[routine]/page.tsx`:

**Remove** these state variables and functions:
- `const [showDeloadPrompt, setShowDeloadPrompt] = useState(false)`
- `async function handleDeloadChoice(choice: 'deload' | 'skip') { ... }`

**Simplify** `handleComplete`:
```typescript
async function handleComplete() {
  setCompleting(true)
  await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routine: routineName }),
  })
  router.push('/')
}
```

**Add** the subtitle below the `<h1>`:
```tsx
<h1 className="text-xl font-bold text-fall-rust">{workout.routine}</h1>
<p className="mt-0.5 text-sm text-fall-bark-light">
  Week {workout.week} · Cycle {workout.cycle}
</p>
```

**Remove** the entire deload prompt modal JSX block:
```tsx
{/* Remove this entire block: */}
{showDeloadPrompt && (
  <div className="fixed inset-0 ...">
    ...
  </div>
)}
```

- [ ] **Step 4: Run page tests**

```bash
npx vitest run __tests__/pages/workout.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/workout/[routine]/page.tsx __tests__/pages/workout.test.tsx
git commit -m "feat: show Week/Cycle subtitle on workout page; remove deload modal"
```

---

### Task 6: History BW filter + settings label

**Files:**
- Modify: `src/app/api/history/route.ts`
- Modify: `src/app/settings/page.tsx`
- Modify: `__tests__/api/history.test.ts` (or create if it doesn't exist — check first)

**Interfaces:**
- History API: bodyweight exercises excluded from response
- Settings: label and button text only (no logic change)

- [ ] **Step 1: Check whether a history test file exists**

```bash
ls __tests__/api/history.test.ts 2>/dev/null && echo exists || echo missing
```

- [ ] **Step 2: Write the history BW filter test**

If the file exists, add to it. If not, create `__tests__/api/history.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run to confirm test fails**

```bash
npx vitest run __tests__/api/history.test.ts 2>&1 | grep FAIL
```

- [ ] **Step 4: Add BW filter to history API**

In `src/app/api/history/route.ts`, find the line:
```typescript
    const config = configs.get(key)
    if (!config) continue
```

Change it to:
```typescript
    const config = configs.get(key)
    if (!config || config.type === 'bodyweight') continue
```

- [ ] **Step 5: Run history test**

```bash
npx vitest run __tests__/api/history.test.ts
```

Expected: pass.

- [ ] **Step 6: Update settings page labels**

In `src/app/settings/page.tsx`, find the "Progression" section and make these text changes:

Change:
```tsx
<p className="text-sm font-medium text-fall-bark mb-3">Cycles before TM increase</p>
```
To:
```tsx
<p className="text-sm font-medium text-fall-bark mb-3">Weeks per cycle</p>
```

Change the button labels from `{n} cycles` to `{n} weeks`:
```tsx
{n} weeks
```

- [ ] **Step 7: Run full suite**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/history/route.ts src/app/settings/page.tsx __tests__/api/history.test.ts
git commit -m "feat: filter BW from history; update progression label to weeks per cycle"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Sessions sheet functions (Task 1)
- ✅ `SessionEntry` type (Task 1)
- ✅ `deriveNextWeekCycle` (Task 2)
- ✅ Per-week accessory increment (Task 2)
- ✅ `WorkoutData.week/cycle` (Task 3)
- ✅ Workout API derives week/cycle from Sessions (Task 3)
- ✅ Complete route writes session + per-routine TM (Task 4)
- ✅ Deload is just week 4, no modal (Task 4 + Task 5)
- ✅ Remove advance-week route (Task 4)
- ✅ Remove accessory TM updates from complete (Task 4)
- ✅ Week/Cycle subtitle in workout heading (Task 5)
- ✅ History BW filter (Task 6)
- ✅ Settings label "weeks per cycle" (Task 6)
- ✅ `cyclesBeforeIncrease` now means wave length — reflected in `deriveNextWeekCycle` and complete route

**Type consistency check:**
- `SessionEntry` defined in Task 1, consumed in Tasks 2, 3, 4 — consistent
- `deriveNextWeekCycle(sessions, routine, waveLength)` defined Task 2, called in Tasks 3 and 4 — consistent
- `generateWorkoutRows(..., sessions?, currentCycle?)` — new optional params, all existing 5-arg calls still work
- `WorkoutData.week / .cycle` — added Task 3, consumed Task 5 — consistent

**Backward compat:**
- Accessory progression falls back to most-recent-history + 5 when `sessions = []` — existing tests unaffected
- `currentWeek`/`currentCycle` in State are no longer read or written; the rows remain in the sheet harmlessly
