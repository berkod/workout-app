import type { EquipmentConfig } from './types'

const STORAGE_KEY = 'equipment_config'

export function getEquipmentConfig(): EquipmentConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EquipmentConfig) : null
  } catch {
    return null
  }
}

export function saveEquipmentConfig(config: EquipmentConfig): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
