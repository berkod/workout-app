# 531 MVP Workout Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app that reads/writes 5/3/1 workout data from a Google Sheet, with collapsible sections, inline editing, and auto-save.

**Architecture:** Next.js App Router with server-side API routes that proxy Google Sheets API calls (keeping credentials secure). React frontend renders workout data in collapsible sections grouped by SET TYPE + EXERCISE. All state flows through the sheet — the app reads on load and writes individual cell updates on user action.

**Tech Stack:** Next.js 16 (App Router), React, Tailwind CSS v4, googleapis npm package, Vitest + React Testing Library, Node.js v24

---

## File Structure

```
src/
  app/
    layout.tsx                          — Root layout, fall theme, meta viewport
    page.tsx                            — Routine selection screen (home)
    globals.css                         — Tailwind imports + fall color theme
    workout/
      [routine]/
        page.tsx                        — Workout view for selected routine
    api/
      routines/
        route.ts                        — GET: unique routines + last completed date
      workout/
        [routine]/
          route.ts                      — GET: all sets for a routine, grouped
      sets/
        route.ts                        — PATCH: update a single cell (actual reps, target weight, target reps)
      complete/
        route.ts                        — POST: complete workout, fill empties with 0, set date
  lib/
    sheets.ts                           — Google Sheets API client (auth, read, write)
    types.ts                            — TypeScript types for workout data
  components/
    RoutineCard.tsx                      — Card showing routine name + last completed date
    WorkoutSection.tsx                   — Collapsible section header + set rows
    SetRow.tsx                          — Single set: exercise, target weight, target reps, actual reps input
    EditableField.tsx                   — Tap-to-edit text field (for target weight/reps)
    CompleteButton.tsx                  — "Complete Workout" button
tailwind.config.ts                      — Fall color theme config
vitest.config.ts                        — Vitest + React Testing Library setup
__tests__/
  lib/
    sheets.test.ts                      — Unit tests for sheets client
  api/
    routines.test.ts                    — Tests for GET /api/routines
    workout.test.ts                     — Tests for GET /api/workout/[routine]
    sets.test.ts                        — Tests for PATCH /api/sets
    complete.test.ts                    — Tests for POST /api/complete
  components/
    RoutineCard.test.tsx                — Tests for RoutineCard
    WorkoutSection.test.tsx             — Tests for WorkoutSection
    SetRow.test.tsx                     — Tests for SetRow
    EditableField.test.tsx              — Tests for EditableField
    CompleteButton.test.tsx             — Tests for CompleteButton
  pages/
    home.test.tsx                       — Tests for routine selection page
    workout.test.tsx                    — Tests for workout page
.env.local                              — GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
.env.example                            — Template with placeholder values
README.md                              — Setup + deployment instructions
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.env.example`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/berkod/projects/workout-app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js scaffold with Tailwind v4.

- [ ] **Step 2: Install dependencies**

```bash
npm install googleapis
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Add test script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Configure fall color theme in globals.css**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-fall-cream: #FFF8F0;
  --color-fall-wheat: #F5E6D3;
  --color-fall-copper: #B87333;
  --color-fall-rust: #C1440E;
  --color-fall-amber: #D4A017;
  --color-fall-olive: #606C38;
  --color-fall-bark: #3E2723;
  --color-fall-bark-light: #5D4037;
}

body {
  background-color: var(--color-fall-cream);
  color: var(--color-fall-bark);
}
```

- [ ] **Step 7: Set up root layout**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '531 Tracker',
  description: '5/3/1 workout tracker',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fall-cream text-fall-bark antialiased">
        <main className="mx-auto max-w-md px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create placeholder home page**

Replace `src/app/page.tsx` with:

```tsx
export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-fall-rust">531 Tracker</h1>
      <p className="mt-2 text-fall-bark-light">Select a routine to begin.</p>
    </div>
  )
}
```

- [ ] **Step 9: Create .env.example**

```
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- [ ] **Step 10: Update .gitignore**

Append to `.gitignore`:

```
.env.local
```

- [ ] **Step 11: Verify setup**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with Tailwind fall theme and Vitest"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create types file**

Create `src/lib/types.ts`:

```typescript
export interface SheetRow {
  rowIndex: number  // 1-based row number in the Google Sheet (header = row 1, first data = row 2)
  date: string
  routine: string
  setType: string
  exercise: string
  targetReps: string
  targetWeight: string
  actualReps: string
}

export interface RoutineSummary {
  name: string
  lastCompleted: string | null  // ISO date string or null if never completed
}

export interface SetGroup {
  setType: string
  exercise: string
  sets: SheetRow[]
}

export interface WorkoutData {
  routine: string
  groups: SetGroup[]
}

export type EditableColumn = 'targetReps' | 'targetWeight' | 'actualReps'

export const COLUMN_MAP: Record<EditableColumn, string> = {
  targetReps: 'E',
  targetWeight: 'F',
  actualReps: 'G',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for workout data model"
```

---

### Task 3: Google Sheets Client

**Files:**
- Create: `src/lib/sheets.ts`, `__tests__/lib/sheets.test.ts`

- [ ] **Step 1: Write failing tests for sheets client**

Create `__tests__/lib/sheets.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('googleapis', () => {
  const mockGet = vi.fn()
  const mockUpdate = vi.fn()
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn().mockImplementation(() => ({})),
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
            ['2026-03-28', 'A: Press', 'warm-up', 'Overhead Press', '5', '45', '5'],
            ['2026-03-28', 'A: Press', 'main', 'Overhead Press', '5', '95', ''],
          ],
        },
      })

      const rows = await getAllRows()

      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({
        rowIndex: 2,
        date: '2026-03-28',
        routine: 'A: Press',
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/sheets.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/sheets'`

- [ ] **Step 3: Implement sheets client**

Create `src/lib/sheets.ts`:

```typescript
import { google } from 'googleapis'
import type { SheetRow } from './types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const SHEET_NAME = 'Sheet1'

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

export async function getAllRows(): Promise<SheetRow[]> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:G`,
  })

  const values = response.data.values
  if (!values || values.length <= 1) return []

  return values.slice(1).map((row, index) => ({
    rowIndex: index + 2, // +2 because: skip header (1) + 0-based to 1-based (1)
    date: row[0] || '',
    routine: row[1] || '',
    setType: row[2] || '',
    exercise: row[3] || '',
    targetReps: row[4] || '',
    targetWeight: row[5] || '',
    actualReps: row[6] || '',
  }))
}

export async function updateCell(
  row: number,
  column: string,
  value: string
): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${column}${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/sheets.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts __tests__/lib/sheets.test.ts
git commit -m "feat: add Google Sheets API client with read/write operations"
```

---

### Task 4: API Route — GET /api/routines

**Files:**
- Create: `src/app/api/routines/route.ts`, `__tests__/api/routines.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/routines.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SheetRow } from '@/lib/types'

const mockGetAllRows = vi.fn()
vi.mock('@/lib/sheets', () => ({
  getAllRows: (...args: unknown[]) => mockGetAllRows(...args),
}))

import { GET } from '@/app/api/routines/route'

describe('GET /api/routines', () => {
  beforeEach(() => {
    mockGetAllRows.mockReset()
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
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/routines.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/routines/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/routines/route.ts`:

```typescript
import { getAllRows } from '@/lib/sheets'
import type { RoutineSummary } from '@/lib/types'

export async function GET() {
  const rows = await getAllRows()

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

  const routines: RoutineSummary[] = Array.from(routineMap.entries()).map(
    ([name, lastCompleted]) => ({ name, lastCompleted })
  )

  return Response.json(routines)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/routines.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/routines/route.ts __tests__/api/routines.test.ts
git commit -m "feat: add GET /api/routines endpoint"
```

---

### Task 5: API Route — GET /api/workout/[routine]

**Files:**
- Create: `src/app/api/workout/[routine]/route.ts`, `__tests__/api/workout.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/workout.test.ts`:

```typescript
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
      { rowIndex: 2, date: '', routine: 'A: Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
      { rowIndex: 3, date: '', routine: 'A: Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '65', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'A: Press', setType: 'main', exercise: 'Overhead Press', targetReps: '5', targetWeight: '95', actualReps: '' },
      { rowIndex: 5, date: '', routine: 'B: RDL', setType: 'warm-up', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makeRequest('A: Press')
    const data = await response.json()

    expect(data.routine).toBe('A: Press')
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/workout.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/workout/[routine]/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/workout/[routine]/route.ts`:

```typescript
import { getAllRows } from '@/lib/sheets'
import type { SetGroup, WorkoutData } from '@/lib/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ routine: string }> }
) {
  const { routine } = await params
  const decodedRoutine = decodeURIComponent(routine)
  const rows = await getAllRows()

  const filtered = rows.filter((row) => row.routine === decodedRoutine)

  const groups: SetGroup[] = []
  for (const row of filtered) {
    const key = `${row.setType}::${row.exercise}`
    let group = groups.find(
      (g) => g.setType === row.setType && g.exercise === row.exercise
    )
    if (!group) {
      group = { setType: row.setType, exercise: row.exercise, sets: [] }
      groups.push(group)
    }
    group.sets.push(row)
  }

  const data: WorkoutData = { routine: decodedRoutine, groups }
  return Response.json(data)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/workout.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/workout/\[routine\]/route.ts __tests__/api/workout.test.ts
git commit -m "feat: add GET /api/workout/[routine] endpoint with grouping"
```

---

### Task 6: API Route — PATCH /api/sets

**Files:**
- Create: `src/app/api/sets/route.ts`, `__tests__/api/sets.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/sets.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/sets.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/sets/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/sets/route.ts`:

```typescript
import { updateCell } from '@/lib/sheets'
import { COLUMN_MAP, type EditableColumn } from '@/lib/types'

export async function PATCH(request: Request) {
  const body = await request.json()
  const { rowIndex, column, value } = body as {
    rowIndex: number
    column: string
    value: string
  }

  if (!(column in COLUMN_MAP)) {
    return Response.json(
      { error: `Invalid column: ${column}` },
      { status: 400 }
    )
  }

  const sheetColumn = COLUMN_MAP[column as EditableColumn]
  await updateCell(rowIndex, sheetColumn, value)

  return Response.json({ success: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/sets.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sets/route.ts __tests__/api/sets.test.ts
git commit -m "feat: add PATCH /api/sets endpoint for cell updates"
```

---

### Task 7: API Route — POST /api/complete

**Files:**
- Create: `src/app/api/complete/route.ts`, `__tests__/api/complete.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/complete.test.ts`:

```typescript
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
      { rowIndex: 2, date: '', routine: 'A: Press', setType: 'warm-up', exercise: 'OHP', targetReps: '5', targetWeight: '45', actualReps: '5' },
      { rowIndex: 3, date: '', routine: 'A: Press', setType: 'main', exercise: 'OHP', targetReps: '5', targetWeight: '95', actualReps: '' },
      { rowIndex: 4, date: '', routine: 'B: RDL', setType: 'warm-up', exercise: 'RDL', targetReps: '5', targetWeight: '135', actualReps: '' },
    ] satisfies SheetRow[])

    const response = await makePostRequest({ routine: 'A: Press' })
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/complete.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/complete/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/complete/route.ts`:

```typescript
import { getAllRows, updateCell } from '@/lib/sheets'

export async function POST(request: Request) {
  const body = await request.json()
  const { routine } = body as { routine: string }

  const rows = await getAllRows()
  const filtered = rows.filter((row) => row.routine === routine)

  const today = new Date().toISOString().split('T')[0]

  const updates: Promise<void>[] = []
  for (const row of filtered) {
    updates.push(updateCell(row.rowIndex, 'A', today))
    if (!row.actualReps) {
      updates.push(updateCell(row.rowIndex, 'G', '0'))
    }
  }

  await Promise.all(updates)

  return Response.json({ success: true, rowsUpdated: filtered.length })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/complete.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/complete/route.ts __tests__/api/complete.test.ts
git commit -m "feat: add POST /api/complete endpoint to finalize workouts"
```

---

### Task 8: RoutineCard Component

**Files:**
- Create: `src/components/RoutineCard.tsx`, `__tests__/components/RoutineCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/RoutineCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoutineCard } from '@/components/RoutineCard'

describe('RoutineCard', () => {
  it('displays routine name and last completed date', () => {
    render(
      <RoutineCard name="A: Press" lastCompleted="2026-03-28" />
    )

    expect(screen.getByText('A: Press')).toBeInTheDocument()
    expect(screen.getByText('Last: 2026-03-28')).toBeInTheDocument()
  })

  it('displays "Never" when no last completed date', () => {
    render(<RoutineCard name="Day 3 – Bench" lastCompleted={null} />)

    expect(screen.getByText('Day 3 – Bench')).toBeInTheDocument()
    expect(screen.getByText('Last: Never')).toBeInTheDocument()
  })

  it('renders as a link to the workout page', () => {
    render(<RoutineCard name="A: Press" lastCompleted="2026-03-28" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      '/workout/Day%201%20%E2%80%93%20Press'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/components/RoutineCard.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/RoutineCard'`

- [ ] **Step 3: Implement RoutineCard**

Create `src/components/RoutineCard.tsx`:

```tsx
import Link from 'next/link'

interface RoutineCardProps {
  name: string
  lastCompleted: string | null
}

export function RoutineCard({ name, lastCompleted }: RoutineCardProps) {
  return (
    <Link
      href={`/workout/${encodeURIComponent(name)}`}
      className="block rounded-lg border border-fall-wheat bg-white p-4 shadow-sm active:bg-fall-wheat"
    >
      <h2 className="text-lg font-semibold text-fall-rust">{name}</h2>
      <p className="mt-1 text-sm text-fall-bark-light">
        Last: {lastCompleted ?? 'Never'}
      </p>
    </Link>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/components/RoutineCard.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoutineCard.tsx __tests__/components/RoutineCard.test.tsx
git commit -m "feat: add RoutineCard component"
```

---

### Task 9: EditableField Component

**Files:**
- Create: `src/components/EditableField.tsx`, `__tests__/components/EditableField.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/EditableField.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditableField } from '@/components/EditableField'

describe('EditableField', () => {
  it('displays value as text by default', () => {
    render(<EditableField value="95" onSave={vi.fn()} />)

    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('switches to input on tap', async () => {
    const user = userEvent.setup()
    render(<EditableField value="95" onSave={vi.fn()} />)

    await user.click(screen.getByText('95'))

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('95')
  })

  it('calls onSave and returns to text on blur', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditableField value="95" onSave={onSave} />)

    await user.click(screen.getByText('95'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '100')
    await user.tab() // blur

    expect(onSave).toHaveBeenCalledWith('100')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('does not call onSave if value unchanged', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EditableField value="95" onSave={onSave} />)

    await user.click(screen.getByText('95'))
    await user.tab() // blur without changing

    expect(onSave).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/components/EditableField.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/EditableField'`

- [ ] **Step 3: Implement EditableField**

Create `src/components/EditableField.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface EditableFieldProps {
  value: string
  onSave: (newValue: string) => void
}

export function EditableField({ value, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleBlur() {
    setEditing(false)
    if (localValue !== value) {
      onSave(localValue)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        role="textbox"
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="w-16 rounded border border-fall-copper bg-white px-2 py-1 text-center text-sm"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded px-2 py-1 text-sm text-fall-copper underline decoration-dotted"
    >
      {localValue}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/components/EditableField.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/EditableField.tsx __tests__/components/EditableField.test.tsx
git commit -m "feat: add EditableField component with tap-to-edit"
```

---

### Task 10: SetRow Component

**Files:**
- Create: `src/components/SetRow.tsx`, `__tests__/components/SetRow.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/SetRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetRow } from '@/components/SetRow'
import type { SheetRow } from '@/lib/types'

const baseSet: SheetRow = {
  rowIndex: 5,
  date: '',
  routine: 'A: Press',
  setType: 'main',
  exercise: 'Overhead Press',
  targetReps: '5',
  targetWeight: '95',
  actualReps: '',
}

describe('SetRow', () => {
  it('displays exercise, target weight, and target reps', () => {
    render(<SetRow set={baseSet} onUpdate={vi.fn()} />)

    expect(screen.getByText('Overhead Press')).toBeInTheDocument()
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows input field for actual reps', () => {
    render(<SetRow set={baseSet} onUpdate={vi.fn()} />)

    const input = screen.getByPlaceholderText('Reps')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('shows save button and calls onUpdate when clicked', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<SetRow set={baseSet} onUpdate={onUpdate} />)

    const input = screen.getByPlaceholderText('Reps')
    await user.type(input, '5')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await user.click(saveBtn)

    expect(onUpdate).toHaveBeenCalledWith(5, 'actualReps', '5')
  })

  it('displays existing actual reps value', () => {
    const set = { ...baseSet, actualReps: '8' }
    render(<SetRow set={set} onUpdate={vi.fn()} />)

    const input = screen.getByPlaceholderText('Reps')
    expect(input).toHaveValue('8')
  })

  it('calls onUpdate when editable target weight is saved', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<SetRow set={baseSet} onUpdate={onUpdate} />)

    // Click on target weight to edit
    await user.click(screen.getByText('95'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '100')
    await user.tab()

    expect(onUpdate).toHaveBeenCalledWith(5, 'targetWeight', '100')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/components/SetRow.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/SetRow'`

- [ ] **Step 3: Implement SetRow**

Create `src/components/SetRow.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { EditableField } from './EditableField'
import type { SheetRow, EditableColumn } from '@/lib/types'

interface SetRowProps {
  set: SheetRow
  onUpdate: (rowIndex: number, column: EditableColumn, value: string) => void
}

export function SetRow({ set, onUpdate }: SetRowProps) {
  const [actualReps, setActualReps] = useState(set.actualReps)
  const [saved, setSaved] = useState(!!set.actualReps)

  function handleSaveActualReps() {
    onUpdate(set.rowIndex, 'actualReps', actualReps)
    setSaved(true)
  }

  return (
    <div className="flex items-center gap-3 border-b border-fall-wheat py-3 last:border-b-0">
      <span className="flex-1 text-sm font-medium">{set.exercise}</span>

      <EditableField
        value={set.targetWeight}
        onSave={(val) => onUpdate(set.rowIndex, 'targetWeight', val)}
      />

      <span className="text-fall-bark-light">×</span>

      <EditableField
        value={set.targetReps}
        onSave={(val) => onUpdate(set.rowIndex, 'targetReps', val)}
      />

      <input
        type="text"
        inputMode="numeric"
        placeholder="Reps"
        value={actualReps}
        onChange={(e) => {
          setActualReps(e.target.value)
          setSaved(false)
        }}
        className="w-14 rounded border border-fall-wheat bg-white px-2 py-1 text-center text-sm focus:border-fall-copper focus:outline-none"
      />

      <button
        type="button"
        aria-label="Save"
        onClick={handleSaveActualReps}
        disabled={saved && actualReps === set.actualReps}
        className="rounded bg-fall-olive px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
      >
        ✓
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/components/SetRow.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SetRow.tsx __tests__/components/SetRow.test.tsx
git commit -m "feat: add SetRow component with actual reps input and save"
```

---

### Task 11: WorkoutSection Component

**Files:**
- Create: `src/components/WorkoutSection.tsx`, `__tests__/components/WorkoutSection.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/WorkoutSection.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutSection } from '@/components/WorkoutSection'
import type { SetGroup } from '@/lib/types'

const group: SetGroup = {
  setType: 'warm-up',
  exercise: 'Overhead Press',
  sets: [
    { rowIndex: 2, date: '', routine: 'Day 1', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
    { rowIndex: 3, date: '', routine: 'Day 1', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '65', actualReps: '' },
  ],
}

describe('WorkoutSection', () => {
  it('displays set type and exercise in header', () => {
    render(
      <WorkoutSection group={group} isOpen={true} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    expect(screen.getByText('warm-up')).toBeInTheDocument()
    expect(screen.getByText('Overhead Press')).toBeInTheDocument()
  })

  it('shows sets when open', () => {
    render(
      <WorkoutSection group={group} isOpen={true} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    expect(screen.getAllByText('Overhead Press')).toHaveLength(3) // header + 2 rows
  })

  it('hides sets when collapsed', () => {
    render(
      <WorkoutSection group={group} isOpen={false} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    // Header still visible
    expect(screen.getByText('warm-up')).toBeInTheDocument()
    // Only the header exercise text, not the rows
    expect(screen.getAllByText('Overhead Press')).toHaveLength(1)
  })

  it('calls onToggle when header is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <WorkoutSection group={group} isOpen={true} onToggle={onToggle} onUpdate={vi.fn()} />
    )

    await user.click(screen.getByText('warm-up'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('shows completion count', () => {
    const partialGroup: SetGroup = {
      ...group,
      sets: [
        { ...group.sets[0], actualReps: '5' },
        { ...group.sets[1], actualReps: '' },
      ],
    }
    render(
      <WorkoutSection group={partialGroup} isOpen={true} onToggle={vi.fn()} onUpdate={vi.fn()} />
    )

    expect(screen.getByText('1/2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/components/WorkoutSection.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/WorkoutSection'`

- [ ] **Step 3: Implement WorkoutSection**

Create `src/components/WorkoutSection.tsx`:

```tsx
'use client'

import { SetRow } from './SetRow'
import type { SetGroup, EditableColumn } from '@/lib/types'

interface WorkoutSectionProps {
  group: SetGroup
  isOpen: boolean
  onToggle: () => void
  onUpdate: (rowIndex: number, column: EditableColumn, value: string) => void
}

export function WorkoutSection({
  group,
  isOpen,
  onToggle,
  onUpdate,
}: WorkoutSectionProps) {
  const completedCount = group.sets.filter((s) => s.actualReps !== '').length
  const totalCount = group.sets.length

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-fall-wheat bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-fall-wheat"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-fall-amber">
            {group.setType}
          </span>
          <span className="ml-2 text-sm font-medium text-fall-bark">
            {group.exercise}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fall-bark-light">
            {completedCount}/{totalCount}
          </span>
          <span className="text-fall-bark-light">{isOpen ? '▾' : '▸'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-fall-wheat px-4">
          {group.sets.map((set) => (
            <SetRow key={set.rowIndex} set={set} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/components/WorkoutSection.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkoutSection.tsx __tests__/components/WorkoutSection.test.tsx
git commit -m "feat: add WorkoutSection component with collapsible sections"
```

---

### Task 12: CompleteButton Component

**Files:**
- Create: `src/components/CompleteButton.tsx`, `__tests__/components/CompleteButton.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/CompleteButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompleteButton } from '@/components/CompleteButton'

describe('CompleteButton', () => {
  it('displays "Complete Workout" text', () => {
    render(<CompleteButton onComplete={vi.fn()} loading={false} />)

    expect(
      screen.getByRole('button', { name: /complete workout/i })
    ).toBeInTheDocument()
  })

  it('calls onComplete when clicked', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<CompleteButton onComplete={onComplete} loading={false} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))
    expect(onComplete).toHaveBeenCalled()
  })

  it('shows loading state and disables button', () => {
    render(<CompleteButton onComplete={vi.fn()} loading={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/components/CompleteButton.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/CompleteButton'`

- [ ] **Step 3: Implement CompleteButton**

Create `src/components/CompleteButton.tsx`:

```tsx
'use client'

interface CompleteButtonProps {
  onComplete: () => void
  loading: boolean
}

export function CompleteButton({ onComplete, loading }: CompleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onComplete}
      disabled={loading}
      className="mt-6 w-full rounded-lg bg-fall-rust py-4 text-lg font-bold text-white shadow-md active:bg-fall-bark disabled:opacity-50"
    >
      {loading ? 'Saving...' : 'Complete Workout'}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/components/CompleteButton.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CompleteButton.tsx __tests__/components/CompleteButton.test.tsx
git commit -m "feat: add CompleteButton component"
```

---

### Task 13: Home Page — Routine Selection

**Files:**
- Modify: `src/app/page.tsx`
- Create: `__tests__/pages/home.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/pages/home.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import Home from '@/app/page'

describe('Home page', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders routine cards after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'A: Press', lastCompleted: '2026-03-28' },
        { name: 'B: RDL', lastCompleted: null },
      ],
    })

    render(<Home />)

    // Wait for data to load
    expect(await screen.findByText('A: Press')).toBeInTheDocument()
    expect(screen.getByText('B: RDL')).toBeInTheDocument()
    expect(screen.getByText('Last: 2026-03-28')).toBeInTheDocument()
    expect(screen.getByText('Last: Never')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves

    render(<Home />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/pages/home.test.tsx
```

Expected: FAIL — the current Home component is a static placeholder.

- [ ] **Step 3: Implement Home page**

Replace `src/app/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { RoutineCard } from '@/components/RoutineCard'
import type { RoutineSummary } from '@/lib/types'

export default function Home() {
  const [routines, setRoutines] = useState<RoutineSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/routines')
      .then((res) => res.json())
      .then((data) => {
        setRoutines(data)
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-fall-rust">531 Tracker</h1>
      <p className="mt-1 text-sm text-fall-bark-light">
        Select a routine to begin.
      </p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-center text-fall-bark-light">Loading...</p>
        ) : (
          routines.map((r) => (
            <RoutineCard
              key={r.name}
              name={r.name}
              lastCompleted={r.lastCompleted}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/pages/home.test.tsx
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx __tests__/pages/home.test.tsx
git commit -m "feat: implement routine selection home page"
```

---

### Task 14: Workout Page

**Files:**
- Create: `src/app/workout/[routine]/page.tsx`, `__tests__/pages/workout.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/pages/workout.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WorkoutData } from '@/lib/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ routine: 'Day%201%20%E2%80%93%20Press' }),
  useRouter: () => ({ push: vi.fn() }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import WorkoutPage from '@/app/workout/[routine]/page'

const mockWorkoutData: WorkoutData = {
  routine: 'A: Press',
  groups: [
    {
      setType: 'warm-up',
      exercise: 'Overhead Press',
      sets: [
        { rowIndex: 2, date: '', routine: 'A: Press', setType: 'warm-up', exercise: 'Overhead Press', targetReps: '5', targetWeight: '45', actualReps: '' },
      ],
    },
    {
      setType: 'main',
      exercise: 'Overhead Press',
      sets: [
        { rowIndex: 4, date: '', routine: 'A: Press', setType: 'main', exercise: 'Overhead Press', targetReps: '5', targetWeight: '95', actualReps: '' },
      ],
    },
  ],
}

describe('Workout page', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('loads and displays workout sections', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorkoutData,
    })

    render(<WorkoutPage />)

    expect(await screen.findByText('A: Press')).toBeInTheDocument()
    expect(screen.getByText('warm-up')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('opens warm-up section by default and collapses others', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorkoutData,
    })

    render(<WorkoutPage />)

    // Wait for load
    await screen.findByText('A: Press')

    // warm-up section should show its set rows (target weight 45 visible)
    expect(screen.getByText('45')).toBeInTheDocument()

    // main section should be collapsed (target weight 95 NOT visible as an editable field in a row)
    // The "main" header text is visible, but the set row content (95) should not be
    const allText = screen.queryAllByText('95')
    expect(allText).toHaveLength(0)
  })

  it('sends PATCH request when actual reps saved', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkoutData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

    render(<WorkoutPage />)

    await screen.findByText('A: Press')

    const input = screen.getByPlaceholderText('Reps')
    await user.type(input, '5')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/sets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: 2, column: 'actualReps', value: '5' }),
      })
    })
  })

  it('shows Complete Workout button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockWorkoutData,
    })

    render(<WorkoutPage />)

    await screen.findByText('A: Press')

    expect(
      screen.getByRole('button', { name: /complete workout/i })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/pages/workout.test.tsx
```

Expected: FAIL — `Cannot find module '@/app/workout/[routine]/page'`

- [ ] **Step 3: Implement the workout page**

Create `src/app/workout/[routine]/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { WorkoutSection } from '@/components/WorkoutSection'
import { CompleteButton } from '@/components/CompleteButton'
import type { WorkoutData, SetGroup, EditableColumn } from '@/lib/types'

export default function WorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const routineName = decodeURIComponent(params.routine as string)

  const [workout, setWorkout] = useState<WorkoutData | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    fetch(`/api/workout/${encodeURIComponent(routineName)}`)
      .then((res) => res.json())
      .then((data: WorkoutData) => {
        setWorkout(data)
        // Open the first section (warm-up) by default
        if (data.groups.length > 0) {
          const firstKey = sectionKey(data.groups[0])
          setOpenSections(new Set([firstKey]))
        }
      })
  }, [routineName])

  function sectionKey(group: SetGroup) {
    return `${group.setType}::${group.exercise}`
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleUpdate = useCallback(
    async (rowIndex: number, column: EditableColumn, value: string) => {
      await fetch('/api/sets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex, column, value }),
      })

      // Update local state
      setWorkout((prev) => {
        if (!prev) return prev
        const updated = {
          ...prev,
          groups: prev.groups.map((g) => ({
            ...g,
            sets: g.sets.map((s) =>
              s.rowIndex === rowIndex ? { ...s, [column]: value } : s
            ),
          })),
        }

        // Auto-advance: if all sets in a section are now complete, close it and open next
        if (column === 'actualReps') {
          const currentGroupIndex = updated.groups.findIndex((g) =>
            g.sets.some((s) => s.rowIndex === rowIndex)
          )
          if (currentGroupIndex !== -1) {
            const currentGroup = updated.groups[currentGroupIndex]
            const allComplete = currentGroup.sets.every(
              (s) => s.actualReps !== ''
            )
            if (allComplete) {
              setOpenSections((prev) => {
                const next = new Set(prev)
                next.delete(sectionKey(currentGroup))
                // Open next section if it exists
                if (currentGroupIndex + 1 < updated.groups.length) {
                  next.add(sectionKey(updated.groups[currentGroupIndex + 1]))
                }
                return next
              })
            }
          }
        }

        return updated
      })
    },
    []
  )

  async function handleComplete() {
    setCompleting(true)
    await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine: routineName }),
    })
    router.push('/')
  }

  if (!workout) {
    return <p className="text-center text-fall-bark-light">Loading...</p>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fall-rust">{workout.routine}</h1>

      <div className="mt-4">
        {workout.groups.map((group) => {
          const key = sectionKey(group)
          return (
            <WorkoutSection
              key={key}
              group={group}
              isOpen={openSections.has(key)}
              onToggle={() => toggleSection(key)}
              onUpdate={handleUpdate}
            />
          )
        })}
      </div>

      <CompleteButton onComplete={handleComplete} loading={completing} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/pages/workout.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/workout/\[routine\]/page.tsx __tests__/pages/workout.test.tsx
git commit -m "feat: implement workout page with sections, auto-save, and auto-advance"
```

---

### Task 15: Run All Tests + Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests PASS (across all `__tests__/` files).

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Fix any issues found**

If any tests fail or the build breaks, fix the issues before proceeding.

- [ ] **Step 4: Commit any fixes**

Only if changes were needed:

```bash
git add -A
git commit -m "fix: resolve test/build issues"
```

---

### Task 16: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

Create `README.md`:

````markdown
# 531 Tracker

A mobile-first web app for tracking 5/3/1 weightlifting workouts. Reads and writes directly to a Google Sheet.

## Features

- **Routine selection** — choose from Day 1 (Press), Day 2 (RDL), or Day 3 (Bench)
- **Collapsible sections** — sets organized by type (warm-up, main, FSL, accessory)
- **Inline editing** — tap target weight or reps to modify
- **Auto-save** — actual reps save to the sheet immediately
- **Auto-advance** — sections collapse when complete, next section opens
- **Complete workout** — one button to finalize, filling empty reps with 0

## Google Sheet Setup

Your Google Sheet must have these columns in row 1:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| DATE | ROUTINE | SET TYPE | EXERCISE | TARGET REPS | TARGET WEIGHT | ACTUAL REPS |

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g., "531 Tracker") and click **Create**

### 2. Enable the Google Sheets API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click **Enable**

### 3. Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name it (e.g., "531-tracker") and click **Create and Continue**
4. Skip the optional role/access steps and click **Done**
5. Click on the new service account email
6. Go to the **Keys** tab → **Add Key** → **Create new key** → **JSON**
7. Save the downloaded JSON file securely

### 4. Share Your Google Sheet

1. Open your Google Sheet
2. Click **Share**
3. Add the service account email (found in the JSON file as `client_email`)
4. Give it **Editor** access
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

### 5. Configure Environment Variables

Create `.env.local` in the project root:

```
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

The `GOOGLE_PRIVATE_KEY` value is the `private_key` field from your service account JSON file. Keep the `\n` characters as-is.

## Local Development

```bash
nvm use           # Uses Node v24 from .nvmrc
npm install
npm run dev       # Starts at http://localhost:3000
```

## Testing

```bash
npm test          # Run all tests
npm run test:watch # Watch mode
```

## Deploying to Opalstack

### Prerequisites

- An Opalstack account with a **Node.js** application type available
- SSH access to your Opalstack server

### 1. Create a Node.js Application in Opalstack

1. Log in to your [Opalstack dashboard](https://my.opalstack.com/)
2. Go to **Applications** → **Add Application**
3. Select **Node.js** as the type
4. Name it (e.g., "531-tracker")
5. Note the assigned port number

### 2. Create a Site and Route

1. Go to **Sites** → **Add Site**
2. Select your domain
3. Add a **Route** pointing `/` to your Node.js application

### 3. Deploy the App

SSH into your Opalstack server:

```bash
ssh your-username@your-server.opalstack.com
cd ~/apps/531-tracker  # Your app directory
```

Clone your repository and set up:

```bash
git clone <your-repo-url> .
nvm install 24
nvm use 24
npm install
npm run build
```

### 4. Set Environment Variables

Create `.env.local` on the server with your Google credentials (same as local development).

### 5. Configure the Start Script

Edit the `start` script or create a `start.sh`:

```bash
#!/bin/bash
export PORT=<your-opalstack-port>
cd ~/apps/531-tracker
source ~/.nvm/nvm.sh
nvm use 24
npm start
```

Make it executable:

```bash
chmod +x start.sh
```

### 6. Restart the Application

In the Opalstack dashboard, click **Restart** on your application, or:

```bash
# Opalstack uses supervisord
supervisorctl restart 531-tracker
```

Your app should now be live at your configured domain.

## Tech Stack

- **Next.js** (App Router) — React framework with server-side API routes
- **Tailwind CSS** — Utility-first styling
- **Google Sheets API** — Data storage via `googleapis` npm package
- **Vitest** — Test framework
````

- [ ] **Step 2: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add README with setup and deployment instructions"
```

---

### Task 17: Final Smoke Test

**Files:** None (manual verification)

- [ ] **Step 1: Create .env.local with real credentials**

Copy `.env.example` to `.env.local` and fill in your real Google credentials.

- [ ] **Step 2: Start dev server and test manually**

```bash
npm run dev
```

Open `http://localhost:3000` on your phone (or use Chrome DevTools mobile mode).

Verify:
1. Home page loads with routine cards
2. Tapping a routine loads the workout view
3. Warm-up section is open, others collapsed
4. Typing actual reps and tapping ✓ saves to the sheet
5. Tapping target weight opens edit mode; blurring saves
6. When all sets in a section are saved, it collapses and next opens
7. "Complete Workout" fills empty actual reps with 0 and returns to home

- [ ] **Step 3: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: final adjustments from smoke test"
```
