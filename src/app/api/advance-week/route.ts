import { getExerciseConfig, updateExerciseTrainingMax, updateWorkoutState } from '@/lib/sheets'

export async function POST(request: Request) {
  const { choice } = await request.json() as { choice: 'deload' | 'skip' }

  if (choice === 'deload') {
    await updateWorkoutState(4)
    return Response.json({ success: true })
  }

  // Skip deload: increment all main TMs and start week 1
  const exerciseConfigs = await getExerciseConfig()
  const mainExercises = [...exerciseConfigs.values()].filter((c) => c.type === 'main')

  await Promise.all([
    ...mainExercises.map((c) => updateExerciseTrainingMax(c.exercise, c.trainingMax + c.increment, 'main')),
    updateWorkoutState(1),
  ])

  return Response.json({ success: true })
}
