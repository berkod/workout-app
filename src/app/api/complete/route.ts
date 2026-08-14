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
