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
  return { routine, groups }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ routine: string }> }
) {
  const { routine } = await params
  const decodedRoutine = decodeURIComponent(routine)

  // Fetch rows and config in parallel; config is needed for display names regardless
  const [rows, exerciseConfigs] = await Promise.all([getAllRows(), getExerciseConfig()])

  // Bug fix: only show empty-date (not-yet-done) rows for this routine
  const pending = rows.filter((r) => r.routine === decodedRoutine && r.date === '')
  if (pending.length > 0) {
    return Response.json(buildWorkoutData(decodedRoutine, pending, exerciseConfigs))
  }

  // No pending rows: generate the next workout from historical data
  const historical = rows.filter((r) => r.routine === decodedRoutine && r.date !== '')
  if (historical.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [] })
  }

  const state = await getWorkoutState()
  const week = state.currentWeek as Week
  const newRows = generateWorkoutRows(decodedRoutine, historical, exerciseConfigs, week)

  if (newRows.length === 0) {
    return Response.json({ routine: decodedRoutine, groups: [] })
  }

  // Append to sheet, then re-fetch to get real rowIndices
  await appendRows(newRows)
  const refreshed = await getAllRows()
  const appended = refreshed.filter((r) => r.routine === decodedRoutine && r.date === '')

  return Response.json(buildWorkoutData(decodedRoutine, appended, exerciseConfigs))
}
