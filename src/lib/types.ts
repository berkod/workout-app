export interface SheetRow {
  rowIndex: number  // 1-based row number in the Google Sheet (header = row 1, first data = row 2)
  date: string
  routine: string
  setType: string
  exercise: string
  targetReps: string
  targetWeight: string
  actualReps: string
}

export interface RoutineSummary {
  name: string
  lastCompleted: string | null  // ISO date string or null if never completed
}

export interface SetGroup {
  setType: string
  exercise: string      // lowercase canonical
  displayName: string   // human-readable label for UI
  equipment: string     // from ExerciseConfig, defaults to 'barbell'
  sets: SheetRow[]
}

export interface WorkoutData {
  routine: string
  groups: SetGroup[]
}

export interface ExerciseConfig {
  exercise: string       // lowercase canonical key
  humanReadable: string  // display name from Config col E
  trainingMax: number
  increment: number
  type: 'main' | 'accessory' | 'bodyweight'
  roundTo: number        // rounding increment for weight calculations, default 2.5
  equipment: 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' | 'bodyweight'
}

export interface PlateEntry {
  weight: number
  count: number
}

export interface EquipmentConfig {
  barWeight: number
  dumbbellHandleWeight: number
  plates: PlateEntry[]
}

export interface WorkoutState {
  currentWeek: number  // 1=week1, 2=week2, 3=week3, 4=deload
  currentCycle: number          // 1 to cyclesBeforeIncrease
  cyclesBeforeIncrease: number  // 3 or 4
  disabledRoutines: string[]    // routine names currently disabled
}

export type EditableColumn = 'targetReps' | 'targetWeight' | 'actualReps'

export const COLUMN_MAP: Record<EditableColumn, string> = {
  targetReps: 'E',
  targetWeight: 'F',
  actualReps: 'G',
}
