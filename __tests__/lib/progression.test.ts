import { describe, it, expect } from 'vitest'
import { roundToNearest, generateWorkoutRows, WEEK_SPEC } from '@/lib/progression'
import type { ExerciseConfig, SheetRow } from '@/lib/types'

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
  return { exercise, humanReadable: exercise, trainingMax, increment, type, roundTo }
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

  it('generates 3 warm-up rows at 40/50/60% of TM', () => {
    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const warmup = rows.filter(r => r.setType === 'warm-up')
    expect(warmup).toHaveLength(3)
    expect(warmup.map(r => r.targetWeight)).toEqual(['80', '100', '120'])
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
  it('uses trainingMax from config and preserves set count/reps from history', () => {
    const historical = [
      makeHistoricalRow({ setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
      makeHistoricalRow({ setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
      makeHistoricalRow({ setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
    ]
    const configs = buildConfigMap(makeConfig('db_bench_press', 50, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const acc = rows.filter(r => r.setType === 'accessory')

    expect(acc).toHaveLength(3)
    expect(acc.every(r => r.targetWeight === '50')).toBe(true)
    expect(acc.every(r => r.targetReps === '10')).toBe(true)
  })

  it('uses most recent date when multiple historical sessions exist', () => {
    const historical = [
      makeHistoricalRow({ date: '2026-03-01', setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
      makeHistoricalRow({ date: '2026-03-01', setType: 'accessory', exercise: 'db_bench_press', targetReps: '10', targetWeight: '45' }),
      makeHistoricalRow({ date: '2026-03-28', setType: 'accessory', exercise: 'db_bench_press', targetReps: '12', targetWeight: '50' }),
    ]
    const configs = buildConfigMap(makeConfig('db_bench_press', 55, 'accessory'))

    const rows = generateWorkoutRows('Press Day', historical, configs, 1)
    const acc = rows.filter(r => r.setType === 'accessory')

    // Most recent session had 1 set with reps '12'
    expect(acc).toHaveLength(1)
    expect(acc[0].targetReps).toBe('12')
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
    const accConfig: ExerciseConfig = { exercise: 'barbell_press', humanReadable: 'Barbell Press (Light)', trainingMax: 95, increment: 5, type: 'accessory' }
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
    // Accessory uses trainingMax=95
    expect(accRows[0].targetWeight).toBe('95')
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
