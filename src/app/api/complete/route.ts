import { getAllRows, updateCell, getExerciseConfig, getWorkoutState, updateWorkoutState, updateExerciseTrainingMax } from '@/lib/sheets'
import { getExercisesToSkip } from '@/lib/progression'

export async function POST(request: Request) {
  const body = await request.json()
  const { routine } = body as { routine: string }

  const [rows, exerciseConfigs, state] = await Promise.all([
    getAllRows(),
    getExerciseConfig(),
    getWorkoutState(),
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

  // Increment accessory training maxes (bodyweight excluded)
  const accessoryExercises = [
    ...new Set(
      pending
        .filter((r) => {
          const key = r.exercise.toLowerCase()
          const config = exerciseConfigs.get(`${key}::accessory`) ?? exerciseConfigs.get(key)
          return config?.type === 'accessory'
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

  const { currentWeek, currentCycle, cyclesBeforeIncrease, disabledRoutines } = state

  if (currentWeek < 3) {
    await updateWorkoutState(currentWeek + 1)
    return Response.json({ success: true, deloadPrompt: false })
  }

  if (currentWeek === 3) {
    if (currentCycle < cyclesBeforeIncrease) {
      await updateWorkoutState(1, currentCycle + 1)
      return Response.json({ success: true, deloadPrompt: false })
    }
    return Response.json({ success: true, deloadPrompt: true })
  }

  // Week 4 (deload) completed: bump non-disabled main TMs and reset to cycle 1 week 1
  const skipExercises = getExercisesToSkip(rows, disabledRoutines)
  const mainExercises = [...exerciseConfigs.values()].filter(
    (c) => c.type === 'main' && !skipExercises.has(c.exercise)
  )
  await Promise.all([
    ...mainExercises.map((c) => updateExerciseTrainingMax(c.exercise, c.trainingMax + c.increment, 'main')),
    updateWorkoutState(1, 1),
  ])

  return Response.json({ success: true, deloadPrompt: false })
}
