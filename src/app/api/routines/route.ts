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
