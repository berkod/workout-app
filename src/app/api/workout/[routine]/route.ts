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
