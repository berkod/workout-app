import { getAllRows, updateCell, getExerciseConfig, getWorkoutState, updateWorkoutState, updateExerciseTrainingMax } from '@/lib/sheets'

export async function POST(request: Request) {
  const body = await request.json()
  const { routine } = body as { routine: string }

  const [rows, exerciseConfigs, state] = await Promise.all([
    getAllRows(),
    getExerciseConfig(),
    getWorkoutState(),
  ])

  // Only operate on the current (not-yet-completed) rows for this routine
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

  // Increment accessory training maxes in config
  const accessoryExercises = [
    ...new Set(
      pending
        .filter((r) => {
          const key = r.exercise.toLowerCase()
          const config = exerciseConfigs.get(`${key}::accessory`) ?? exerciseConfigs.get(key)
          return config?.type === 'accessory' // bodyweight excluded — nothing to increment
        })
        .map((r) => r.exercise.toLowerCase())
    ),
  ]
  await Promise.all(
    accessoryExercises.map((exercise) => {
      const config = exerciseConfigs.get(`${exercise}::accessory`) ?? exerciseConfigs.get(exercise)!
      return updateExerciseTrainingMax(exercise, config.trainingMax + config.increment, 'accessory')
    })
  )

  const currentWeek = state.currentWeek

  if (currentWeek < 3) {
    await updateWorkoutState(currentWeek + 1)
    return Response.json({ success: true, deloadPrompt: false })
  }

  if (currentWeek === 3) {
    // Let the user decide: deload week or skip straight to next cycle
    return Response.json({ success: true, deloadPrompt: true })
  }

  // Week 4 (deload) just completed: bump all main TMs and reset to week 1
  const mainExercises = [...exerciseConfigs.values()].filter((c) => c.type === 'main')
  await Promise.all([
    ...mainExercises.map((c) => updateExerciseTrainingMax(c.exercise, c.trainingMax + c.increment, 'main')),
    updateWorkoutState(1),
  ])

  return Response.json({ success: true, deloadPrompt: false })
}
