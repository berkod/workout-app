import { getAllRows, appendRows, deleteRows, updateExerciseTrainingMax, updateWorkoutState } from '@/lib/sheets'
import type { SheetRow } from '@/lib/types'

// One-time reset migration:
//   1. Extracts exercise structure from latest completed session per routine
//   2. Clears all Sheet1 rows
//   3. Reinserts extracted rows as seed data (dated 2024-01-01)
//   4. Updates main lift TMs to Press=97.5, Bench=130, Squat=160
//   5. Resets State to week=1, cycle=1
//
// Run once via: POST /api/migrate/reset
// Delete this file after confirming the reset worked.
export async function POST() {
  const rows = await getAllRows()

  // Step 1: Extract seed structure from the latest completed session per routine.
  // BBB/FSL rows are skipped — generateWorkoutRows produces those programmatically.
  const SUPPLEMENTAL = new Set(['bbb', 'fsl'])
  const routines = [...new Set(rows.filter((r) => r.routine).map((r) => r.routine))]
  const seedRows: Omit<SheetRow, 'rowIndex'>[] = []
  const seededRoutines: string[] = []

  for (const routine of routines) {
    const completed = rows.filter((r) => r.routine === routine && r.date !== '')
    if (completed.length === 0) continue

    const latestDate = completed.reduce((max, r) => (r.date > max ? r.date : max), '')
    const latestSession = completed.filter((r) => r.date === latestDate)
    const structureRows = latestSession.filter((r) => !SUPPLEMENTAL.has(r.setType.toLowerCase()))

    for (const row of structureRows) {
      seedRows.push({
        date: '2024-01-01',
        routine: row.routine,
        setType: row.setType,
        exercise: row.exercise,
        targetReps: row.targetReps,
        targetWeight: row.targetWeight,
        actualReps: row.actualReps || '0',
      })
    }

    seededRoutines.push(routine)
  }

  const notSeeded = routines.filter((r) => !seededRoutines.includes(r))

  // Step 2: Delete all current Sheet1 rows
  if (rows.length > 0) {
    await deleteRows(rows.map((r) => r.rowIndex))
  }

  // Step 3: Append seed rows
  if (seedRows.length > 0) {
    await appendRows(seedRows)
  }

  // Step 4: Update main lift TMs
  await Promise.all([
    updateExerciseTrainingMax('barbell_press', 97.5, 'main'),
    updateExerciseTrainingMax('bench_press', 130, 'main'),
    updateExerciseTrainingMax('back_squat', 160, 'main'),
  ])

  // Step 5: Reset week and cycle
  await updateWorkoutState(1, 1)

  return Response.json({
    success: true,
    rowsDeleted: rows.length,
    seedRowsInserted: seedRows.length,
    seededRoutines,
    notSeeded,
    newTMs: { barbell_press: 97.5, bench_press: 130, back_squat: 160 },
  })
}
