import { getAllRows, getExerciseConfig } from '@/lib/sheets'
import type { SheetRow } from '@/lib/types'

export interface SessionRecord {
  date: string
  topSetWeight: string
  topSetTarget: string
  topSetActual: string
}

export interface ExerciseHistory {
  exercise: string
  displayName: string
  type: 'main' | 'accessory' | 'bodyweight'
  currentTM: number
  sessions: SessionRecord[]
}

export async function GET() {
  const [rows, configs] = await Promise.all([getAllRows(), getExerciseConfig()])

  const completed = rows.filter((r) => r.date !== '')

  // Group by compound key (exercise::main or exercise::accessory)
  const byKey = new Map<string, SheetRow[]>()
  for (const row of completed) {
    const ex = row.exercise.toLowerCase()
    const compoundType = row.setType.toLowerCase() === 'accessory' ? 'accessory' : 'main'
    const key = `${ex}::${compoundType}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(row)
  }

  const result: ExerciseHistory[] = []

  for (const [key, exerciseRows] of byKey) {
    const config = configs.get(key)
    if (!config) continue

    // Group rows by date → one session per day
    const byDate = new Map<string, SheetRow[]>()
    for (const row of exerciseRows) {
      if (!byDate.has(row.date)) byDate.set(row.date, [])
      byDate.get(row.date)!.push(row)
    }

    // Build session records: newest first, cap at 8
    const dates = [...byDate.keys()].sort().reverse().slice(0, 8)
    const sessions: SessionRecord[] = dates.map((date) => {
      const sets = byDate.get(date)!
      // For main exercises, prefer the AMRAP set (targetReps contains '+')
      const top =
        sets.find((r) => r.targetReps.includes('+')) ??
        sets.reduce((best, r) => {
          const w = parseFloat(r.targetWeight) || 0
          return w > (parseFloat(best.targetWeight) || 0) ? r : best
        }, sets[0])
      return {
        date: top.date,
        topSetWeight: top.targetWeight,
        topSetTarget: top.targetReps,
        topSetActual: top.actualReps,
      }
    })

    result.push({
      exercise: config.exercise,
      displayName: config.humanReadable,
      type: config.type,
      currentTM: config.trainingMax,
      sessions,
    })
  }

  // Sort: main first, then accessory/bodyweight; alphabetical within group
  result.sort((a, b) => {
    if (a.type === 'main' && b.type !== 'main') return -1
    if (a.type !== 'main' && b.type === 'main') return 1
    return a.displayName.localeCompare(b.displayName)
  })

  return Response.json(result)
}
