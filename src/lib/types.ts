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
  type: 'main' | 'accessory'
}

export interface WorkoutState {
  currentWeek: number  // 1=week1, 2=week2, 3=week3, 4=deload
}

export type EditableColumn = 'targetReps' | 'targetWeight' | 'actualReps'

export const COLUMN_MAP: Record<EditableColumn, string> = {
  targetReps: 'E',
  targetWeight: 'F',
  actualReps: 'G',
}
