import type { ExerciseConfig, SheetRow } from './types'

export type Week = 1 | 2 | 3 | 4

interface SetSpec {
  pct: number
  reps: string
}

interface WeekSpec {
  warmup: SetSpec[]
  main: SetSpec[]
  fslPct: number
  fslSets: number
  fslReps: string
}

export const WEEK_SPEC: Record<Week, WeekSpec> = {
  1: {
    warmup: [
      { pct: 0.40, reps: '5' },
      { pct: 0.50, reps: '5' },
      { pct: 0.60, reps: '5' },
    ],
    main: [
      { pct: 0.65, reps: '5' },
      { pct: 0.75, reps: '5' },
      { pct: 0.85, reps: '5+' },
    ],
    fslPct: 0.65,
    fslSets: 5,
    fslReps: '5',
  },
  2: {
    warmup: [
      { pct: 0.40, reps: '5' },
      { pct: 0.50, reps: '5' },
      { pct: 0.60, reps: '5' },
    ],
    main: [
      { pct: 0.70, reps: '3' },
      { pct: 0.80, reps: '3' },
      { pct: 0.90, reps: '3+' },
    ],
    fslPct: 0.70,
    fslSets: 5,
    fslReps: '5',
  },
  3: {
    warmup: [
      { pct: 0.40, reps: '5' },
      { pct: 0.50, reps: '5' },
      { pct: 0.60, reps: '5' },
    ],
    main: [
      { pct: 0.75, reps: '5' },
      { pct: 0.85, reps: '3' },
      { pct: 0.95, reps: '1+' },
    ],
    fslPct: 0.75,
    fslSets: 5,
    fslReps: '5',
  },
  4: {
    // Deload: lighter main work, no FSL
    warmup: [
      { pct: 0.40, reps: '5' },
      { pct: 0.50, reps: '5' },
      { pct: 0.60, reps: '5' },
    ],
    main: [
      { pct: 0.40, reps: '5' },
      { pct: 0.50, reps: '5' },
      { pct: 0.60, reps: '5' },
    ],
    fslPct: 0,
    fslSets: 0,
    fslReps: '5',
  },
}

export function roundToNearest(weight: number, increment = 2.5): number {
  return Math.round(weight / increment) * increment
}

/**
 * Generates new workout rows for a routine.
 *
 * Uses all historical rows to derive the exercise/setType structure (so FSL
 * rows are never lost just because the last cycle was a deload). Weights are
 * calculated from the current training max in exerciseConfigs.
 */
export function generateWorkoutRows(
  routine: string,
  allHistoricalRows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>,
  week: Week,
): Omit<SheetRow, 'rowIndex'>[] {
  const spec = WEEK_SPEC[week]
  const result: Omit<SheetRow, 'rowIndex'>[] = []

  // Collect unique (setType, exercise) pairs in first-appearance order
  const seen = new Set<string>()
  const pairs: Array<{ setType: string; exercise: string }> = []
  for (const row of allHistoricalRows) {
    const key = `${row.setType}::${row.exercise}`
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ setType: row.setType, exercise: row.exercise })
    }
  }

  for (const { setType, exercise } of pairs) {
    const setTypeLower = setType.toLowerCase()
    const isAccessorySet = setTypeLower === 'accessory'
    const key = exercise.toLowerCase()
    const config =
      exerciseConfigs.get(`${key}::${isAccessorySet ? 'accessory' : 'main'}`) ??
      exerciseConfigs.get(key)
    if (!config) continue

    const base = { date: '', routine, exercise, actualReps: '' }

    if (setTypeLower === 'warm-up' && config.type === 'main') {
      for (let i = 0; i < spec.warmup.length; i++) {
        const s = spec.warmup[i]
        const weight = i === 0 ? '45' : String(roundToNearest(config.trainingMax * s.pct, config.roundTo))
        result.push({ ...base, setType, targetReps: s.reps, targetWeight: weight })
      }
    } else if (setTypeLower === 'main' && config.type === 'main') {
      for (const s of spec.main) {
        result.push({ ...base, setType, targetReps: s.reps, targetWeight: String(roundToNearest(config.trainingMax * s.pct, config.roundTo)) })
      }
    } else if (setTypeLower === 'fsl' && config.type === 'main') {
      if (spec.fslSets === 0) continue // skip FSL on deload
      const fslWeight = roundToNearest(config.trainingMax * spec.fslPct, config.roundTo)
      for (let i = 0; i < spec.fslSets; i++) {
        result.push({ ...base, setType, targetReps: spec.fslReps, targetWeight: String(fslWeight) })
      }
    } else if (isAccessorySet) {
      // Derive set count and reps from most recent completed occurrence
      const historicalSets = allHistoricalRows.filter(
        (r) => r.setType.toLowerCase() === 'accessory' && r.exercise === exercise && r.date !== ''
      )
      const latestDate = historicalSets.reduce((max, r) => (r.date > max ? r.date : max), '')
      const latestSets = historicalSets.filter((r) => r.date === latestDate)
      const numSets = latestSets.length || 1
      const reps = latestSets[0]?.targetReps ?? '10'
      const weight = config.type === 'bodyweight' ? 'BW' : String(config.trainingMax)

      for (let i = 0; i < numSets; i++) {
        result.push({ ...base, setType, targetReps: reps, targetWeight: weight })
      }
    }
  }

  return result
}

export function getExercisesToSkip(
  rows: SheetRow[],
  disabledRoutines: string[]
): Set<string> {
  const disabled = new Set(disabledRoutines)
  const activeExercises = new Set<string>()
  const disabledExercises = new Set<string>()

  for (const row of rows) {
    const ex = row.exercise.toLowerCase()
    if (disabled.has(row.routine)) {
      disabledExercises.add(ex)
    } else {
      activeExercises.add(ex)
    }
  }

  return new Set([...disabledExercises].filter((ex) => !activeExercises.has(ex)))
}
