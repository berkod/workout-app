import { getAllRows, appendRows, getExerciseConfig, getWorkoutState } from '@/lib/sheets'
import { generateWorkoutRows } from '@/lib/progression'
import type { ExerciseConfig, SetGroup, WorkoutData, SheetRow } from '@/lib/types'
import type { Week } from '@/lib/progression'

function buildWorkoutData(
  routine: string,
  rows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>
): WorkoutData {
  const groups: SetGroup[] = []
  for (const row of rows) {
    let group = groups.find((g) => g.setType === row.setType && g.exercise === row.exercise)
    if (!group) {
      const isAccessory = row.setType.toLowerCase() === 'accessory'
      const key = row.exercise.toLowerCase()
      const config =
        exerciseConfigs.get(`${key}::${isAccessory ? 'accessory' : 'main'}`) ??
        exerciseConfigs.get(key)
      group = {
        setType: row.setType,
        exercise: row.exercise,
        displayName: config?.humanReadable ?? row.exercise,
        equipment: config?.equipment ?? 'barbell',
        sets: [],
      }
      groups.push(group)
    }
    group.sets.push(row)
  }
  return { routine, groups, isPreview: false }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ routine: string }> }
) {
  const { routine } = await params
  const decodedRoutine = decodeURIComponent(routine)

  const [rows, exerciseConfigs] = await Promise.all([getAllRows(), getExerciseConfig()])

  const pending = rows.filter((r) => r.routine === decodedRoutine && r.date === '')
  if (pending.length > 0) {
    return Response.json(buildWorkoutData(decodedRoutine, pending, exerciseConfigs))
  }

  const historical = rows.filter((r) => r.routine === decodedRoutine && r.date !== '')
  if (historical.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [], isPreview: false })
  }

  // No pending rows but history exists — return a preview without writing to the sheet.
  // Negative rowIndices are sentinels: they guarantee unique React keys and signal
  // that these rows have no backing sheet row (onUpdate must not be called).
  const state = await getWorkoutState()
  const week = state.currentWeek as Week
  const previewRows = generateWorkoutRows(decodedRoutine, historical, exerciseConfigs, week, state.program)
    .map((r, i): SheetRow => ({ ...r, rowIndex: -(i + 1), date: '', actualReps: '' }))

  const preview = buildWorkoutData(decodedRoutine, previewRows, exerciseConfigs)
  return Response.json({ ...preview, isPreview: true })
}

// POST: user pressed "Start Workout" — generate rows and commit them to the sheet.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ routine: string }> }
) {
  const { routine } = await params
  const decodedRoutine = decodeURIComponent(routine)

  const [rows, exerciseConfigs] = await Promise.all([getAllRows(), getExerciseConfig()])

  // Idempotent: if rows were already generated (e.g., double-tap), return them.
  const existing = rows.filter((r) => r.routine === decodedRoutine && r.date === '')
  if (existing.length > 0) {
    return Response.json(buildWorkoutData(decodedRoutine, existing, exerciseConfigs))
  }

  const historical = rows.filter((r) => r.routine === decodedRoutine && r.date !== '')
  if (historical.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [], isPreview: false })
  }

  const state = await getWorkoutState()
  const week = state.currentWeek as Week
  const newRows = generateWorkoutRows(decodedRoutine, historical, exerciseConfigs, week, state.program)

  if (newRows.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [], isPreview: false })
  }

  await appendRows(newRows)
  const refreshed = await getAllRows()
  const appended = refreshed.filter((r) => r.routine === decodedRoutine && r.date === '')

  return Response.json(buildWorkoutData(decodedRoutine, appended, exerciseConfigs))
}
