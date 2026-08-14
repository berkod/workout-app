import { getAllRows, appendRows, getExerciseConfig, getWorkoutState, getSessions } from '@/lib/sheets'
import { generateWorkoutRows, deriveNextWeekCycle } from '@/lib/progression'
import type { ExerciseConfig, SetGroup, WorkoutData, SheetRow, Week } from '@/lib/types'

function buildWorkoutData(
  routine: string,
  rows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>,
  week: number = 1,
  cycle: number = 1,
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
  return { routine, groups, isPreview: false, week, cycle }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ routine: string }> }
) {
  const { routine } = await params
  const decodedRoutine = decodeURIComponent(routine)

  const [rows, exerciseConfigs, state, sessions] = await Promise.all([
    getAllRows(),
    getExerciseConfig(),
    getWorkoutState(),
    getSessions(),
  ])

  const { week, cycle } = deriveNextWeekCycle(sessions, decodedRoutine, state.cyclesBeforeIncrease)

  const pending = rows.filter((r) => r.routine === decodedRoutine && r.date === '')
  if (pending.length > 0) {
    return Response.json(buildWorkoutData(decodedRoutine, pending, exerciseConfigs, week, cycle))
  }

  const historical = rows.filter((r) => r.routine === decodedRoutine && r.date !== '')
  if (historical.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [], isPreview: false, week, cycle })
  }

  // No pending rows but history exists — return a preview without writing to the sheet.
  // Negative rowIndices are sentinels: they guarantee unique React keys and signal
  // that these rows have no backing sheet row (onUpdate must not be called).
  const previewRows = generateWorkoutRows(decodedRoutine, historical, exerciseConfigs, week as Week, state.program, sessions, cycle)
    .map((r, i): SheetRow => ({ ...r, rowIndex: -(i + 1), date: '', actualReps: '' }))

  const preview = buildWorkoutData(decodedRoutine, previewRows, exerciseConfigs, week, cycle)
  return Response.json({ ...preview, isPreview: true })
}

// POST: user pressed "Start Workout" — generate rows and commit them to the sheet.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ routine: string }> }
) {
  const { routine } = await params
  const decodedRoutine = decodeURIComponent(routine)

  const [rows, exerciseConfigs, state, sessions] = await Promise.all([
    getAllRows(),
    getExerciseConfig(),
    getWorkoutState(),
    getSessions(),
  ])

  const { week, cycle } = deriveNextWeekCycle(sessions, decodedRoutine, state.cyclesBeforeIncrease)

  // Idempotent: if rows were already generated (e.g., double-tap), return them.
  const existing = rows.filter((r) => r.routine === decodedRoutine && r.date === '')
  if (existing.length > 0) {
    return Response.json(buildWorkoutData(decodedRoutine, existing, exerciseConfigs, week, cycle))
  }

  const historical = rows.filter((r) => r.routine === decodedRoutine && r.date !== '')
  if (historical.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [], isPreview: false, week, cycle })
  }

  const newRows = generateWorkoutRows(decodedRoutine, historical, exerciseConfigs, week as Week, state.program, sessions, cycle)

  if (newRows.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [], isPreview: false, week, cycle })
  }

  await appendRows(newRows)
  const refreshed = await getAllRows()
  const appended = refreshed.filter((r) => r.routine === decodedRoutine && r.date === '')

  return Response.json(buildWorkoutData(decodedRoutine, appended, exerciseConfigs, week, cycle))
}
