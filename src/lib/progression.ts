import type { ExerciseConfig, Program, SessionEntry, SheetRow } from './types'

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
  bbbPct: number
  bbbSets: number
  bbbReps: string
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
    fslPct: 0.65, fslSets: 5, fslReps: '5',
    bbbPct: 0.50, bbbSets: 5, bbbReps: '10',
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
    fslPct: 0.70, fslSets: 5, fslReps: '5',
    bbbPct: 0.60, bbbSets: 5, bbbReps: '10',
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
    fslPct: 0.75, fslSets: 5, fslReps: '5',
    bbbPct: 0.70, bbbSets: 5, bbbReps: '10',
  },
  4: {
    // Deload: lighter main work, no supplemental for either program
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
    fslPct: 0, fslSets: 0, fslReps: '5',
    bbbPct: 0, bbbSets: 0, bbbReps: '10',
  },
}

export function roundToNearest(weight: number, increment = 2.5): number {
  return Math.round(weight / increment) * increment
}

// Historical FSL/BBB rows are skipped when deriving structure — the active program
// drives what supplemental work gets generated, not what was done in the past.
const SUPPLEMENTAL_SET_TYPES = new Set(['fsl', 'bbb'])

export function deriveNextWeekCycle(
  sessions: SessionEntry[],
  routine: string,
  waveLength: number,
): { week: number; cycle: number } {
  const routineSessions = sessions
    .filter((s) => s.routine === routine)
    .sort((a, b) => b.date.localeCompare(a.date))
  const last = routineSessions[0]
  if (!last) return { week: 1, cycle: 1 }
  if (last.week < waveLength) return { week: last.week + 1, cycle: last.cycle }
  return { week: 1, cycle: last.cycle + 1 }
}

export function generateWorkoutRows(
  routine: string,
  allHistoricalRows: SheetRow[],
  exerciseConfigs: Map<string, ExerciseConfig>,
  week: Week,
  program: Program = 'FSL',
  sessions: SessionEntry[] = [],
  currentCycle: number = 1,
): Omit<SheetRow, 'rowIndex'>[] {
  const spec = WEEK_SPEC[week]
  const result: Omit<SheetRow, 'rowIndex'>[] = []

  // Collect unique (setType, exercise) pairs — skip FSL/BBB (handled programmatically below)
  const seen = new Set<string>()
  const pairs: Array<{ setType: string; exercise: string }> = []
  for (const row of allHistoricalRows) {
    if (SUPPLEMENTAL_SET_TYPES.has(row.setType.toLowerCase())) continue
    const key = `${row.setType}::${row.exercise}`
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ setType: row.setType, exercise: row.exercise })
    }
  }

  // Pass 1: warm-up and main sets
  for (const { setType, exercise } of pairs) {
    const setTypeLower = setType.toLowerCase()
    if (setTypeLower === 'accessory') continue
    const key = exercise.toLowerCase()
    const config = exerciseConfigs.get(`${key}::main`) ?? exerciseConfigs.get(key)
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
    }
  }

  // Collect main exercises in order they appear in history, for supplemental generation
  const mainExercises: string[] = []
  const seenMain = new Set<string>()
  for (const row of allHistoricalRows) {
    if (row.setType.toLowerCase() === 'main' && !seenMain.has(row.exercise)) {
      seenMain.add(row.exercise)
      mainExercises.push(row.exercise)
    }
  }

  if (program === 'FSL' && spec.fslSets > 0) {
    for (const exercise of mainExercises) {
      const key = exercise.toLowerCase()
      const config = exerciseConfigs.get(`${key}::main`) ?? exerciseConfigs.get(key)
      if (!config || config.type !== 'main') continue
      const weight = roundToNearest(config.trainingMax * spec.fslPct, config.roundTo)
      for (let i = 0; i < spec.fslSets; i++) {
        result.push({ date: '', routine, exercise, setType: 'FSL', targetReps: spec.fslReps, targetWeight: String(weight), actualReps: '' })
      }
    }
  } else if (program === 'BBB' && spec.bbbSets > 0) {
    for (const exercise of mainExercises) {
      const key = exercise.toLowerCase()
      const config = exerciseConfigs.get(`${key}::main`) ?? exerciseConfigs.get(key)
      if (!config || config.type !== 'main') continue
      const weight = roundToNearest(config.trainingMax * spec.bbbPct, config.roundTo)
      for (let i = 0; i < spec.bbbSets; i++) {
        result.push({ date: '', routine, exercise, setType: 'BBB', targetReps: spec.bbbReps, targetWeight: String(weight), actualReps: '' })
      }
    }
  }

  // Pass 2: accessory sets (after supplemental so order is warm-up → main → BBB/FSL → accessories)
  for (const { setType, exercise } of pairs) {
    if (setType.toLowerCase() !== 'accessory') continue
    const key = exercise.toLowerCase()
    const config = exerciseConfigs.get(`${key}::accessory`) ?? exerciseConfigs.get(key)
    if (!config) continue

    // Find previous-week sessions for this routine (earlier cycle or earlier week in same cycle)
    const prevWeekSessions = sessions
      .filter(
        (s) =>
          s.routine === routine &&
          (s.cycle < currentCycle || (s.cycle === currentCycle && s.week < week)),
      )
      .sort((a, b) => b.date.localeCompare(a.date))

    let prevWeight: string | undefined

    if (sessions.some((s) => s.routine === routine)) {
      // Sessions data available: look up rows from most recent prior-week session
      const prevWeekDate = prevWeekSessions[0]?.date
      if (prevWeekDate) {
        const prevWeekSets = allHistoricalRows.filter(
          (r) =>
            r.setType.toLowerCase() === 'accessory' &&
            r.exercise === exercise &&
            r.date === prevWeekDate,
        )
        prevWeight = prevWeekSets[0]?.targetWeight
      }
      // No prior-week session → prevWeight stays undefined → falls back to TM below
    } else {
      // No sessions data: backward compat — use most recent completed session
      const historicalSets = allHistoricalRows.filter(
        (r) => r.setType.toLowerCase() === 'accessory' && r.exercise === exercise && r.date !== '',
      )
      const latestDate = historicalSets.reduce((max, r) => (r.date > max ? r.date : max), '')
      const latestSets = historicalSets.filter((r) => r.date === latestDate)
      prevWeight = latestSets[0]?.targetWeight
    }

    // Recompute numSets and reps from most recent history regardless of week
    const recentAccessorySets = allHistoricalRows
      .filter(
        (r) => r.setType.toLowerCase() === 'accessory' && r.exercise === exercise && r.date !== '',
      )
    const latestDate = recentAccessorySets.reduce((max, r) => (r.date > max ? r.date : max), '')
    const latestSets = recentAccessorySets.filter((r) => r.date === latestDate)
    const numSets = latestSets.length || 1
    const reps = latestSets[0]?.targetReps ?? '10'

    const weight =
      config.type === 'bodyweight'
        ? 'BW'
        : prevWeight !== undefined
          ? String(roundToNearest(Number(prevWeight) + 5, config.roundTo ?? 2.5))
          : String(config.trainingMax)
    for (let i = 0; i < numSets; i++) {
      result.push({ date: '', routine, exercise, setType, targetReps: reps, targetWeight: weight, actualReps: '' })
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
