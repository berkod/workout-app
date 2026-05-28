import { getExerciseConfig, updateExerciseTrainingMax, updateWorkoutState, getWorkoutState, getAllRows } from '@/lib/sheets'
import { getExercisesToSkip } from '@/lib/progression'

export async function POST(request: Request) {
  const { choice } = await request.json() as { choice: 'deload' | 'skip' }

  if (choice === 'deload') {
    await updateWorkoutState(4)
    return Response.json({ success: true })
  }

  const [exerciseConfigs, state, allRows] = await Promise.all([
    getExerciseConfig(),
    getWorkoutState(),
    getAllRows(),
  ])

  const skipExercises = getExercisesToSkip(allRows, state.disabledRoutines)
  const mainExercises = [...exerciseConfigs.values()].filter(
    (c) => c.type === 'main' && !skipExercises.has(c.exercise)
  )

  await Promise.all([
    ...mainExercises.map((c) => updateExerciseTrainingMax(c.exercise, c.trainingMax + c.increment, 'main')),
    updateWorkoutState(1, 1),
  ])

  return Response.json({ success: true })
}
