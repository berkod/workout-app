import { getAllRows, getWorkoutState, setRoutineDisabled, setCyclesBeforeIncrease, setProgram, deleteRows } from '@/lib/sheets'
import type { Program, RoutineSummary } from '@/lib/types'

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
    program: state.program,
  })
}

export async function PATCH(request: Request) {
  const body = await request.json() as
    | { routine: string; disabled: boolean }
    | { cyclesBeforeIncrease: 3 | 4 }
    | { program: Program }

  if ('routine' in body) {
    await setRoutineDisabled(body.routine, body.disabled)
  } else if ('program' in body) {
    const currentState = await getWorkoutState()
    if (body.program !== currentState.program) {
      await setProgram(body.program)
      const rows = await getAllRows()
      const pendingIndices = rows.filter((r) => r.date === '').map((r) => r.rowIndex)
      await deleteRows(pendingIndices)
    }
  } else {
    await setCyclesBeforeIncrease(body.cyclesBeforeIncrease)
  }

  return Response.json({ success: true })
}
