import type { EquipmentConfig, PlateEntry } from './types'

const EPSILON = 0.001

export interface BarbellBreakdown {
  type: 'barbell'
  targetWeight: number
  barWeight: number
  perSide: PlateEntry[]
  achievable: boolean
}

export interface DumbbellBreakdown {
  type: 'dumbbell'
  targetWeight: number
  plates: Array<PlateEntry & { paired: boolean }>
  achievable: boolean
}

export type PlateBreakdown = BarbellBreakdown | DumbbellBreakdown

function canAchieve(target: number, plates: Array<{ weight: number; count: number }>): boolean {
  let remaining = target
  for (const p of plates) {
    if (remaining < EPSILON) break
    const toUse = Math.min(p.count, Math.floor(remaining / p.weight + EPSILON))
    remaining -= toUse * p.weight
  }
  return remaining < EPSILON
}

function calculateBarbell(targetWeight: number, config: EquipmentConfig): BarbellBreakdown {
  const platesPerSide = (targetWeight - config.barWeight) / 2
  if (platesPerSide < -EPSILON) {
    return { type: 'barbell', targetWeight, barWeight: config.barWeight, perSide: [], achievable: false }
  }
  if (platesPerSide < EPSILON) {
    return { type: 'barbell', targetWeight, barWeight: config.barWeight, perSide: [], achievable: true }
  }

  // Each plate needs one on each side → effective count per side is floor(count / 2)
  const availablePerSide = config.plates.map((p) => ({
    weight: p.weight,
    count: Math.floor(p.count / 2),
  }))

  const used: PlateEntry[] = []
  let remaining = platesPerSide
  for (const plate of availablePerSide) {
    if (remaining < EPSILON) break
    const toUse = Math.min(plate.count, Math.floor(remaining / plate.weight + EPSILON))
    if (toUse > 0) {
      used.push({ weight: plate.weight, count: toUse })
      remaining -= toUse * plate.weight
    }
  }

  return {
    type: 'barbell',
    targetWeight,
    barWeight: config.barWeight,
    perSide: used,
    achievable: remaining < EPSILON,
  }
}

function calculateDumbbell(targetWeight: number, config: EquipmentConfig): DumbbellBreakdown {
  const platesToLoad = targetWeight - config.dumbbellHandleWeight
  if (platesToLoad < -EPSILON) {
    return { type: 'dumbbell', targetWeight, plates: [], achievable: false }
  }
  if (platesToLoad < EPSILON) {
    return { type: 'dumbbell', targetWeight, plates: [], achievable: true }
  }

  const inventory = config.plates.map((p) => ({ ...p }))
  const resultPlates: Array<PlateEntry & { paired: boolean }> = []
  let remaining = platesToLoad

  // Pass 1: maximize balanced (paired) loading.
  // For each plate, use as many pairs as possible, but only if the remainder
  // after those pairs is still achievable with the plates that remain.
  for (let i = 0; i < inventory.length; i++) {
    if (remaining < EPSILON) break
    const plate = inventory[i]
    const pairsAvailable = Math.floor(plate.count / 2)
    if (pairsAvailable === 0) continue

    let pairsToUse = Math.min(pairsAvailable, Math.floor(remaining / (2 * plate.weight)))

    while (pairsToUse > 0) {
      const remainingAfterPairs = remaining - pairsToUse * 2 * plate.weight
      if (remainingAfterPairs < EPSILON) break // perfect fit

      const availableForRemainder: Array<{ weight: number; count: number }> = [
        { weight: plate.weight, count: plate.count - pairsToUse * 2 },
        ...inventory.slice(i + 1),
      ]
      if (canAchieve(remainingAfterPairs, availableForRemainder)) break
      pairsToUse--
    }

    if (pairsToUse > 0) {
      resultPlates.push({ weight: plate.weight, count: pairsToUse * 2, paired: true })
      remaining -= pairsToUse * 2 * plate.weight
      plate.count -= pairsToUse * 2
    }
  }

  // Pass 2: cover remaining weight with singles
  for (const plate of inventory) {
    if (remaining < EPSILON) break
    const toUse = Math.min(plate.count, Math.floor(remaining / plate.weight + EPSILON))
    if (toUse > 0) {
      resultPlates.push({ weight: plate.weight, count: toUse, paired: false })
      remaining -= toUse * plate.weight
      plate.count -= toUse
    }
  }

  return { type: 'dumbbell', targetWeight, plates: resultPlates, achievable: remaining < EPSILON }
}

export function calculatePlates(
  targetWeightStr: string,
  equipment: string,
  config: EquipmentConfig
): PlateBreakdown | null {
  if (!['barbell', 'dumbbell'].includes(equipment)) return null
  if (targetWeightStr === 'BW' || targetWeightStr === '') return null
  const weight = parseFloat(targetWeightStr)
  if (isNaN(weight)) return null

  if (equipment === 'barbell') return calculateBarbell(weight, config)
  return calculateDumbbell(weight, config)
}

export function formatPlateBreakdown(breakdown: PlateBreakdown): string {
  if (breakdown.type === 'barbell') {
    if (breakdown.perSide.length === 0) {
      return `Bar only (${breakdown.barWeight} lbs)`
    }
    const sides = breakdown.perSide.map((p) => `${p.count}×${p.weight}`).join(', ')
    return `Bar (${breakdown.barWeight}) + ${sides} per side`
  }
  if (breakdown.plates.length === 0) return 'No plates needed'
  return breakdown.plates.map((p) => `${p.count}×${p.weight}`).join(', ')
}
