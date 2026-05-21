import { describe, it, expect } from 'vitest'
import { calculatePlates, formatPlateBreakdown } from '@/lib/plateCalculator'
import type { EquipmentConfig } from '@/lib/types'

const config: EquipmentConfig = {
  barWeight: 45,
  dumbbellHandleWeight: 0,
  plates: [
    { weight: 45, count: 4 },
    { weight: 35, count: 2 },
    { weight: 25, count: 4 },
    { weight: 10, count: 4 },
    { weight: 5, count: 4 },
    { weight: 2.5, count: 4 },
    { weight: 1.25, count: 2 },
  ],
}

describe('calculatePlates — barbell', () => {
  it('calculates standard barbell load', () => {
    const result = calculatePlates('120', 'barbell', config)
    expect(result?.type).toBe('barbell')
    expect(result?.achievable).toBe(true)
    if (result?.type === 'barbell') {
      const total = result.barWeight + result.perSide.reduce((s, p) => s + p.weight * p.count, 0) * 2
      expect(total).toBeCloseTo(120, 2)
    }
  })

  it('bar only when target equals bar weight', () => {
    const result = calculatePlates('45', 'barbell', config)
    expect(result?.type).toBe('barbell')
    expect(result?.achievable).toBe(true)
    if (result?.type === 'barbell') {
      expect(result.perSide).toHaveLength(0)
    }
  })

  it('not achievable when target is less than bar weight', () => {
    const result = calculatePlates('35', 'barbell', config)
    expect(result?.type).toBe('barbell')
    expect(result?.achievable).toBe(false)
  })

  it('formats barbell breakdown correctly', () => {
    const result = calculatePlates('135', 'barbell', config)
    expect(result).not.toBeNull()
    const formatted = formatPlateBreakdown(result!)
    expect(formatted).toContain('per side')
    expect(formatted).toContain('Bar (45)')
  })
})

describe('calculatePlates — dumbbell', () => {
  it('matches user example: 33.75 lbs', () => {
    const result = calculatePlates('33.75', 'dumbbell', config)
    expect(result?.type).toBe('dumbbell')
    expect(result?.achievable).toBe(true)
    if (result?.type === 'dumbbell') {
      const total = result.plates.reduce((s, p) => s + p.weight * p.count, 0)
      expect(total).toBeCloseTo(33.75, 2)
      // Should use 2×10, 2×5, 1×2.5, 1×1.25
      const paired10 = result.plates.find((p) => p.weight === 10 && p.paired)
      expect(paired10?.count).toBe(2)
      const paired5 = result.plates.find((p) => p.weight === 5 && p.paired)
      expect(paired5?.count).toBe(2)
    }
  })

  it('prefers pairs over singles', () => {
    const result = calculatePlates('20', 'dumbbell', config)
    expect(result?.type).toBe('dumbbell')
    if (result?.type === 'dumbbell') {
      const pairedPlates = result.plates.filter((p) => p.paired)
      expect(pairedPlates.length).toBeGreaterThan(0)
    }
  })

  it('allows singles when pairs cannot reach target', () => {
    const result = calculatePlates('2.5', 'dumbbell', config)
    expect(result?.type).toBe('dumbbell')
    expect(result?.achievable).toBe(true)
    if (result?.type === 'dumbbell') {
      const total = result.plates.reduce((s, p) => s + p.weight * p.count, 0)
      expect(total).toBeCloseTo(2.5, 2)
    }
  })
})

describe('calculatePlates — edge cases', () => {
  it('returns null for BW', () => {
    expect(calculatePlates('BW', 'barbell', config)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(calculatePlates('', 'barbell', config)).toBeNull()
  })

  it('returns null for non-numeric', () => {
    expect(calculatePlates('abc', 'barbell', config)).toBeNull()
  })

  it('returns null for cable', () => {
    expect(calculatePlates('100', 'cable', config)).toBeNull()
  })

  it('returns null for machine', () => {
    expect(calculatePlates('80', 'machine', config)).toBeNull()
  })
})
