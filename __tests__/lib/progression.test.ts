import { describe, it, expect } from 'vitest'
import { roundToNearest, generateWorkoutRows, WEEK_SPEC, getExercisesToSkip, deriveNextWeekCycle } from '@/lib/progression'
import type { ExerciseConfig, SheetRow } from '@/lib/types'
import type { SessionEntry } from '@/lib/types'

// ─── helpers ────────────────────────────────────────────────────────────────

function buildConfigMap(...configs: ExerciseConfig[]): Map<string, ExerciseConfig> {
  const map = new Map<string, ExerciseConfig>()
  for (const c of configs) {
    const compoundType = c.type === 'bodyweight' ? 'accessory' : c.type
    map.set(`${c.exercise}::${compoundType}`, c)
    map.set(c.exercise, c)
  }
  return map
}

function makeConfig(exercise: string, trainingMax: number, type: ExerciseConfig['type'] = 'main', increment = 5, roundTo = 2.5): ExerciseConfig {
  return { exercise, humanReadable: exercise, trainingMax, increment, type, roundTo, equipment: 'barbell' as const }
}

function makeHistoricalRow(overrides: Partial<SheetRow> = {}): SheetRow {
  return {
    rowIndex: 2,
    date: '2026-03-01',
    routine: 'Press Day',
    setType: 'warm-up',
    exercise: 'barbell_press',
    targetReps: '5',
    targetWeight: '80',
    actualReps: '5',
    ...overrides,
  }
}

/** Build a full historical press day: warm-up × 3, main × 3, FSL × 5 */
function makePressHistorical(exercise = 'barbell_press', date = '2026-03-01'): SheetRow[] {
  let idx = 2
  const row = (setType: string, targetReps: string, targetWeight: string): SheetRow => ({
    rowIndex: idx++, date, routine: 'Press Day', setType, exercise, targetReps, targetWeight, actualReps: '5',
  })
  return [
    row('warm-up', '5', '80'), row('warm-up', '5', '100'), row('warm-up', '5', '120'),
    row('main', '5', '130'), row('main', '5', '150'), row('main', '5+', '170'),
    row('FSL', '5', '130'), row('FSL', '5', '130'), row('FSL', '5', '130'), row('FSL', '5', '130'), row('FSL', '5', '130'),
  ]
}

// ─── roundToNearest ─────────────────────────────────────────────────────────

describe('roundToNearest', () => {
  it('rounds to nearest 2.5 by default', () => expect(roundToNearest(107.25)).toBe(107.5))
  it('rounds down to 2.5 increment', () => expect(roundToNearest(106)).toBe(105))
  it('rounds up to 2.5 increment', () => expect(roundToNearest(106.5)).toBe(107.5))
  it('leaves multiples of 2.5 unchanged', () => expect(roundToNearest(107.5)).toBe(107.5))
  it('handles zero', () => expect(roundToNearest(0)).toBe(0))
  it('rounds to 5 when increment=5', () => expect(roundToNearest(107.25, 5)).toBe(105))
  it('rounds to 5 up when increment=5', () => expect(roundToNearest(108, 5)).toBe(110))
})

// ─── WEEK_SPEC sanity ────────────────────────────────────────────────────────

describe('WEEK_SPEC', () => {
  it('week 4 (deload) has fslSets = 0', () => expect(WEEK_SPEC[4].fslSets).toBe(0))
  it('weeks 1–3 have fslSets = 5', () => {
    expect(WEEK_SPEC[1].fslSets).toBe(5)
    expect(WEEK_SPEC[2].fslSets).toBe(5)
    expect(WEEK_SPEC[3].fslSets).toBe(5)
  })
  it('week 3 last main set is 1+', () => expect(WEEK_SPEC[3].main[2].reps).toBe('1+'))
  it('week 2 last main set is 3+', () => expect(WEEK_SPEC[2].main[2].reps).toBe('3+'))
  it('week 1 last main set is 5+', () => expect(WEEK_SPEC[1].main[2].reps).toBe('5+'))
})

// ─── generateWorkoutRows ─────────────────────────────────────────────────────

describe('generateWorkoutRows — week 1 (5/5/5+)', () => {
  const historical = makePressHistorical()
  const configs = buildConfigMap(makeConfig('barbell_press', 200))

  it('generates 3 warm-up rows — bar weight then 50/60% of TM', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const warmup = rows.filter(r => r.setType === 'warm-up')
    expect(warmup).toHaveLength(3)
    expect(warmup.map(r => r.targetWeight)).toEqual(['45', '100', '120'])
    expect(warmup.every(r => r.targetReps === '5')).toBe(true)
  })

  it('generates 3 main rows at 65/75/85% of TM with correct reps', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const main = rows.filter(r => r.setType === 'main')
    expect(main).toHaveLength(3)
    expect(main.map(r => r.targetWeight)).toEqual(['130', '150', '170'])
    expect(main.map(r => r.targetReps)).toEqual(['5', '5', '5+'])
  })

  it('generates 5 FSL rows at 65% of TM', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const fsl = rows.filter(r => r.setType === 'FSL')
    expect(fsl).toHaveLength(5)
    expect(fsl.every(r => r.targetWeight === '130')).toBe(true)
    expect(fsl.every(r => r.targetReps === '5')).toBe(true)
  })

  it('sets date to empty and actualReps to empty on all rows', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    expect(rows.every(r => r.date === '')).toBe(true)
    expect(rows.every(r => r.actualReps === '')).toBe(true)
  })
})

describe('generateWorkoutRows — week 2 (3/3/3+)', () => {
  const historical = makePressHistorical()
  const configs = buildConfigMap(makeConfig('barbell_press', 200))

  it('generates main rows at 70/80/90% with reps 3/3/3+', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 2)
    const main = rows.filter(r => r.setType === 'main')
    expect(main.map(r => r.targetWeight)).toEqual(['140', '160', '180'])
    expect(main.map(r => r.targetReps)).toEqual(['3', '3', '3+'])
  })

  it('generates FSL at 70% of TM', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 2)
    const fsl = rows.filter(r => r.setType === 'FSL')
    expect(fsl).toHaveLength(5)
    expect(fsl[0].targetWeight).toBe('140')
  })
})

describe('generateWorkoutRows — week 3 (5/3/1+)', () => {
  const historical = makePressHistorical()
  const configs = buildConfigMap(makeConfig('barbell_press', 200))

  it('generates main rows at 75/85/95% with reps 5/3/1+', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 3)
    const main = rows.filter(r => r.setType === 'main')
    expect(main.map(r => r.targetWeight)).toEqual(['150', '170', '190'])
    expect(main.map(r => r.targetReps)).toEqual(['5', '3', '1+'])
  })
})

describe('generateWorkoutRows — week 4 (deload)', () => {
  const historical = makePressHistorical()
  const configs = buildConfigMap(makeConfig('barbell_press', 200))

  it('generates main rows at 40/50/60% with 5 reps each', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 4)
    const main = rows.filter(r => r.setType === 'main')
    expect(main.map(r => r.targetWeight)).toEqual(['80', '100', '120'])
    expect(main.every(r => r.targetReps === '5')).toBe(true)
  })

  it('generates no FSL rows on deload', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 4)
    expect(rows.filter(r => r.setType === 'FSL')).toHaveLength(0)
  })

  it('still generates FSL for weeks after deload (uses all historical, not just last)', () => {
    // Simulate: most recent workout was a deload (no FSL rows), but full historical has FSL
    const deloadRows = [
      makeHistoricalRow({ date: '2026-04-01', setType: 'warm-up' }),
      makeHistoricalRow({ date: '2026-04-01', setType: 'main' }),
    ]
    const fullHistorical = [...makePressHistorical(), ...deloadRows]
    const rows = generateWorkoutRows('Press Day', fullHistorical, configs, 1)
    expect(rows.filter(r => r.setType === 'FSL')).toHaveLength(5)
  })
})

describe('generateWorkoutRows — accessories', () => {
  it('increments weight by 5lbs from the previous session and preserves set count/reps', () => {
    const historical = [
      makeHistoricalRow({ setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '60' }),
      makeHistoricalRow({ setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '60' }),
      makeHistoricalRow({ setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '60' }),
    ]
    const configs = buildConfigMap(makeConfig('db_bench_press', 100, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const acc = rows.filter(r => r.setType === 'accessory')

    expect(acc).toHaveLength(3)
    expect(acc.every(r => r.targetWeight === '65')).toBe(true)  // 60 + 5
    expect(acc.every(r => r.targetReps === '10')).toBe(true)
  })

  it('uses most recent date when multiple historical sessions exist, then increments by 5', () => {
    const historical = [
      makeHistoricalRow({ date: '2026-03-01', setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
      makeHistoricalRow({ date: '2026-03-01', setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
      makeHistoricalRow({ date: '2026-03-28', setType: 'accessory', exercise: 'db_bench_press', targetReps: '12', targetWeight: '50' }),
    ]
    const configs = buildConfigMap(makeConfig('db_bench_press', 100, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const acc = rows.filter(r => r.setType === 'accessory')

    // Most recent session had 1 set at 50lbs → next is 55
    expect(acc).toHaveLength(1)
    expect(acc[0].targetReps).toBe('12')
    expect(acc[0].targetWeight).toBe('55')  // 50 + 5
  })

  it('falls back to trainingMax when no completed accessory history exists', () => {
    // Pending (date='') rows establish the pair but not the historical weight
    const historical = [
      makeHistoricalRow({ date: '', setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '40', actualReps: '' }),
    ]
    const configs = buildConfigMap(makeConfig('db_bench_press', 45, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const acc = rows.filter(r => r.setType === 'accessory')

    expect(acc).toHaveLength(1)
    expect(acc[0].targetWeight).toBe('45')  // fallback to TM
  })
})

describe('generateWorkoutRows — bodyweight', () => {
  it('generates rows with targetWeight BW', () => {
    const historical = [
      makeHistoricalRow({ setType: 'accessory', exercise: 'pullups', targetReps: '8', targetWeight: 'BW' }),
      makeHistoricalRow({ setType: 'accessory', exercise: 'pullups', targetReps: '8', targetWeight: 'BW' }),
    ]
    const configs = buildConfigMap(makeConfig('pullups', 0, 'bodyweight', 0))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const bw = rows.filter(r => r.exercise === 'pullups')

    expect(bw).toHaveLength(2)
    expect(bw.every(r => r.targetWeight === 'BW')).toBe(true)
    expect(bw.every(r => r.targetReps === '8')).toBe(true)
  })
})

describe('generateWorkoutRows — edge cases', () => {
  it('skips exercises not in config', () => {
    const historical = [makeHistoricalRow({ setType: 'main', exercise: 'unknown_exercise' })]
    const rows = generateWorkoutRows('Press Day', historical, new Map(), 1)
    expect(rows).toHaveLength(0)
  })

  it('handles dual-role exercise: main vs accessory use separate configs', () => {
    const mainConfig = makeConfig('barbell_press', 165, 'main', 5)
    const accConfig: ExerciseConfig = { exercise: 'barbell_press', humanReadable: 'Barbell Press (Light)', trainingMax: 95, increment: 5, type: 'accessory', roundTo: 2.5, equipment: 'barbell' }
    const configs = new Map([
      ['barbell_press::main', mainConfig],
      ['barbell_press::accessory', accConfig],
      ['barbell_press', mainConfig],
    ])

    const historical = [
      makeHistoricalRow({ setType: 'main', exercise: 'barbell_press' }),
      makeHistoricalRow({ setType: 'accessory', exercise: 'barbell_press', targetReps: '10', targetWeight: '95' }),
    ]

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const mainRows = rows.filter(r => r.setType === 'main')
    const accRows = rows.filter(r => r.setType === 'accessory')

    // Main uses TM=165: 65% = 107.25 → 107.5 (nearest 2.5)
    expect(mainRows[0].targetWeight).toBe('107.5')
    // Accessory increments from previous target (95) by 5 → 100
    expect(accRows[0].targetWeight).toBe('100')
  })

  it('weights are rounded to nearest 5', () => {
    const historical = makePressHistorical()
    const configs = buildConfigMap(makeConfig('barbell_press', 165))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const main = rows.filter(r => r.setType === 'main')

    // 165 * 0.65 = 107.25 → 107.5 (nearest 2.5)
    // 165 * 0.75 = 123.75 → 125  (nearest 2.5)
    // 165 * 0.85 = 140.25 → 140  (nearest 2.5)
    expect(main.map(r => r.targetWeight)).toEqual(['107.5', '125', '140'])
  })
})

describe('WEEK_SPEC — BBB fields', () => {
  it('weeks 1–3 have bbbSets = 5', () => {
    expect(WEEK_SPEC[1].bbbSets).toBe(5)
    expect(WEEK_SPEC[2].bbbSets).toBe(5)
    expect(WEEK_SPEC[3].bbbSets).toBe(5)
  })
  it('week 4 has bbbSets = 0', () => expect(WEEK_SPEC[4].bbbSets).toBe(0))
  it('BBB percentages are 50/60/70% for weeks 1/2/3', () => {
    expect(WEEK_SPEC[1].bbbPct).toBe(0.50)
    expect(WEEK_SPEC[2].bbbPct).toBe(0.60)
    expect(WEEK_SPEC[3].bbbPct).toBe(0.70)
  })
})

describe('generateWorkoutRows — BBB program', () => {
  const historical = makePressHistorical()  // has FSL rows in history
  const configs = buildConfigMap(makeConfig('barbell_press', 200))

  it('generates no FSL rows when program is BBB', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1, 'BBB')
    expect(rows.filter(r => r.setType === 'FSL')).toHaveLength(0)
  })

  it('generates 5 BBB rows at 50% TM for week 1', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1, 'BBB')
    const bbb = rows.filter(r => r.setType === 'BBB')
    expect(bbb).toHaveLength(5)
    expect(bbb.every(r => r.targetWeight === '100')).toBe(true)  // 200 * 0.50 = 100
    expect(bbb.every(r => r.targetReps === '10')).toBe(true)
  })

  it('generates BBB rows at 60% TM for week 2', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 2, 'BBB')
    const bbb = rows.filter(r => r.setType === 'BBB')
    expect(bbb).toHaveLength(5)
    expect(bbb[0].targetWeight).toBe('120')  // 200 * 0.60
  })

  it('generates BBB rows at 70% TM for week 3', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB')
    const bbb = rows.filter(r => r.setType === 'BBB')
    expect(bbb).toHaveLength(5)
    expect(bbb[0].targetWeight).toBe('140')  // 200 * 0.70
  })

  it('generates no BBB rows on deload (week 4)', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 4, 'BBB')
    expect(rows.filter(r => r.setType === 'BBB')).toHaveLength(0)
  })

  it('still generates warm-up and main sets', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1, 'BBB')
    expect(rows.filter(r => r.setType === 'warm-up')).toHaveLength(3)
    expect(rows.filter(r => r.setType === 'main')).toHaveLength(3)
  })

  it('historical FSL rows do not regenerate when program is BBB', () => {
    // historical contains FSL rows — they should be completely ignored
    const rows = generateWorkoutRows('Press Day', historical, configs, 1, 'BBB')
    expect(rows.filter(r => r.setType === 'FSL')).toHaveLength(0)
    expect(rows.filter(r => r.setType === 'BBB')).toHaveLength(5)
  })

  it('historical BBB rows do not regenerate when program is FSL', () => {
    // swap FSL rows in history for BBB rows
    const bbbHistorical = historical.map(r =>
      r.setType === 'FSL' ? { ...r, setType: 'BBB', targetReps: '10' } : r
    )
    const rows = generateWorkoutRows('Press Day', bbbHistorical, configs, 1, 'FSL')
    expect(rows.filter(r => r.setType === 'BBB')).toHaveLength(0)
    expect(rows.filter(r => r.setType === 'FSL')).toHaveLength(5)
  })
})

describe('generateWorkoutRows — output ordering', () => {
  const pressWithAccessories = [
    makeHistoricalRow({ setType: 'warm-up' }),
    makeHistoricalRow({ setType: 'warm-up' }),
    makeHistoricalRow({ setType: 'warm-up' }),
    makeHistoricalRow({ setType: 'main' }),
    makeHistoricalRow({ setType: 'main' }),
    makeHistoricalRow({ setType: 'main' }),
    makeHistoricalRow({ setType: 'BBB', targetReps: '10' }),
    makeHistoricalRow({ setType: 'BBB', targetReps: '10' }),
    makeHistoricalRow({ setType: 'BBB', targetReps: '10' }),
    makeHistoricalRow({ setType: 'BBB', targetReps: '10' }),
    makeHistoricalRow({ setType: 'BBB', targetReps: '10' }),
    makeHistoricalRow({ setType: 'accessory', exercise: 'pull_up', targetReps: '10', targetWeight: 'BW' }),
    makeHistoricalRow({ setType: 'accessory', exercise: 'pull_up', targetReps: '10', targetWeight: 'BW' }),
  ]
  const configs = buildConfigMap(
    makeConfig('barbell_press', 200),
    makeConfig('pull_up', 0, 'bodyweight', 0),
  )

  it('BBB rows appear before accessories in the output', () => {
    const rows = generateWorkoutRows('Press Day', pressWithAccessories, configs, 1, 'BBB')
    const firstBBBIndex = rows.findIndex(r => r.setType === 'BBB')
    const firstAccIndex = rows.findIndex(r => r.setType === 'accessory')
    expect(firstBBBIndex).toBeGreaterThan(-1)
    expect(firstAccIndex).toBeGreaterThan(-1)
    expect(firstBBBIndex).toBeLessThan(firstAccIndex)
  })

  it('FSL rows appear before accessories in the output', () => {
    const withFSL = pressWithAccessories.map(r =>
      r.setType === 'BBB' ? { ...r, setType: 'FSL' } : r
    )
    const rows = generateWorkoutRows('Press Day', withFSL, configs, 1, 'FSL')
    const firstFSLIndex = rows.findIndex(r => r.setType === 'FSL')
    const firstAccIndex = rows.findIndex(r => r.setType === 'accessory')
    expect(firstFSLIndex).toBeGreaterThan(-1)
    expect(firstAccIndex).toBeGreaterThan(-1)
    expect(firstFSLIndex).toBeLessThan(firstAccIndex)
  })
})

describe('getExercisesToSkip', () => {
  function makeRow(routine: string, exercise: string): SheetRow {
    return {
      rowIndex: 1, date: '2026-01-01', routine, setType: 'main',
      exercise, targetReps: '5', targetWeight: '100', actualReps: '5',
    }
  }

  it('returns exercises that only appear in disabled routines', () => {
    const rows = [
      makeRow('Day 2 - RDL', 'rdl'),
      makeRow('Day 1 - Press', 'ohp'),
    ]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL'])
    expect(result).toEqual(new Set(['rdl']))
  })

  it('does not skip an exercise that appears in both a disabled and an active routine', () => {
    const rows = [
      makeRow('Day 2 - RDL', 'rdl'),
      makeRow('Day 1 - Press', 'rdl'),
    ]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL'])
    expect(result).toEqual(new Set())
  })

  it('returns empty set when no routines are disabled', () => {
    const rows = [makeRow('Day 1 - Press', 'ohp')]
    const result = getExercisesToSkip(rows, [])
    expect(result).toEqual(new Set())
  })

  it('normalizes exercise names to lowercase', () => {
    const rows = [makeRow('Day 2 - RDL', 'RDL')]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL'])
    expect(result.has('rdl')).toBe(true)
  })

  it('skips multiple exercises from multiple disabled routines', () => {
    const rows = [
      makeRow('Day 2 - RDL', 'rdl'),
      makeRow('Day 4 - Squat', 'squat'),
      makeRow('Day 1 - Press', 'ohp'),
    ]
    const result = getExercisesToSkip(rows, ['Day 2 - RDL', 'Day 4 - Squat'])
    expect(result).toEqual(new Set(['rdl', 'squat']))
  })
})

describe('deriveNextWeekCycle', () => {
  it('returns week 1 cycle 1 when no sessions exist for the routine', () => {
    expect(deriveNextWeekCycle([], 'Day 1', 3)).toEqual({ week: 1, cycle: 1 })
  })

  it('ignores sessions for other routines', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 2', week: 3, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 1, cycle: 1 })
  })

  it('advances week within wave (waveLength=3)', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 1', week: 1, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 2, cycle: 1 })
  })

  it('rolls to week 1 and bumps cycle after last week of wave (waveLength=3)', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Day 1', week: 3, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 1, cycle: 2 })
  })

  it('advances to week 4 (deload) when waveLength=4 and last was week 3', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Day 1', week: 3, cycle: 2 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 4)).toEqual({ week: 4, cycle: 2 })
  })

  it('rolls to week 1 and bumps cycle after deload (waveLength=4)', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Day 1', week: 4, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 4)).toEqual({ week: 1, cycle: 2 })
  })

  it('uses the most recent session when multiple exist', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 1', week: 1, cycle: 1 },
      { date: '2026-08-08', routine: 'Day 1', week: 2, cycle: 1 },
    ]
    expect(deriveNextWeekCycle(sessions, 'Day 1', 3)).toEqual({ week: 3, cycle: 1 })
  })
})

describe('generateWorkoutRows — accessory per-week sessions', () => {
  it('uses prior-week session targetWeight + 5 when sessions data available', () => {
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Press Day', week: 2, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // Generating week 3, cycle 1 → prior week = week 2, cycle 1 → date 2026-08-01 → weight 50+5
    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', sessions, 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('55')
  })

  it('falls back to trainingMax when sessions exist but no prior-week session for this routine', () => {
    // The only session IS week 3 cycle 1 (same as what we are generating), so no prior-week
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Press Day', week: 3, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 45, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', sessions, 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('45')  // TM fallback
  })

  it('uses prior-cycle session when current week 1 of new cycle', () => {
    // Last session was week 3, cycle 1. Now generating week 1, cycle 2.
    const sessions: SessionEntry[] = [
      { date: '2026-08-14', routine: 'Press Day', week: 3, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-14', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '60', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // Generating week 1, cycle 2 → prior = cycle 1 (any week) → week 3 date → weight 60+5
    const rows = generateWorkoutRows('Press Day', historical, configs, 1, 'BBB', sessions, 2)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('65')
  })

  it('backward compat: no sessions → uses most recent historical + 5', () => {
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // sessions=[] → backward compat path
    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', [], 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('55')  // 50 + 5
  })

  it('uses backward compat path when sessions exist for other routines but not this one', () => {
    // Sessions exist, but only for a different routine (Day 2, not Press Day)
    const sessions: SessionEntry[] = [
      { date: '2026-08-01', routine: 'Day 2', week: 2, cycle: 1 },
    ]
    const historical = [
      makeHistoricalRow({ date: '2026-08-01', setType: 'accessory', exercise: 'db_curl', targetReps: '10', targetWeight: '50', actualReps: '10' }),
    ]
    const configs = buildConfigMap(makeConfig('db_curl', 100, 'accessory'))

    // Should use backward compat (most recent historical + 5), not fall back to TM
    const rows = generateWorkoutRows('Press Day', historical, configs, 3, 'BBB', sessions, 1)
    const acc = rows.filter((r) => r.setType === 'accessory')
    expect(acc[0].targetWeight).toBe('55')  // 50 + 5, NOT 100 (TM)
  })
})
