import { getAllRows, updateCell, appendRows } from '@/lib/sheets'
import type { SheetRow } from '@/lib/types'

// One-time migration: replaces pull_up with neutral_grip_lat_pulldown and adds face_pull rows.
// Run once via: POST /api/migrate/swap-pullups
// Delete this file after confirming the migration worked.
export async function POST() {
  const rows = await getAllRows()
  const pullUpRows = rows.filter(r => r.exercise.toLowerCase() === 'pull_up')

  if (pullUpRows.length === 0) {
    return Response.json({ success: true, message: 'No pull_up rows found — already migrated or not yet seeded' })
  }

  // Update exercise (col D) and clear targetWeight (col F) for every pull_up row
  const updates: Promise<void>[] = []
  for (const row of pullUpRows) {
    updates.push(updateCell(row.rowIndex, 'D', 'neutral_grip_lat_pulldown'))
    updates.push(updateCell(row.rowIndex, 'F', ''))
  }
  await Promise.all(updates)

  // Backfill 3 face_pull rows for each unique (routine, date) session that had pull_ups.
  // Historical sessions get a real date + actualReps so they count as completed history.
  // Pending sessions (date='') get pending face_pull rows that will appear in the next workout.
  const seen = new Set<string>()
  const faceRows: Omit<SheetRow, 'rowIndex'>[] = []
  for (const row of pullUpRows) {
    const key = `${row.routine}::${row.date}`
    if (seen.has(key)) continue
    seen.add(key)
    for (let i = 0; i < 3; i++) {
      faceRows.push({
        date: row.date,
        routine: row.routine,
        setType: 'accessory',
        exercise: 'face_pull',
        targetReps: '15',
        targetWeight: '',
        actualReps: row.date ? '15' : '',
      })
    }
  }
  await appendRows(faceRows)

  return Response.json({
    success: true,
    pullUpRowsUpdated: pullUpRows.length,
    faceRowsAdded: faceRows.length,
    routines: [...new Set(pullUpRows.map(r => r.routine))],
  })
}
