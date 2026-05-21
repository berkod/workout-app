import { google } from 'googleapis'
import type { EquipmentConfig, ExerciseConfig, PlateEntry, SheetRow, WorkoutState } from './types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? ''
const SHEET_NAME = 'Sheet1'

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

export async function getAllRows(): Promise<SheetRow[]> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:G`,
  })

  const values = response.data.values
  if (!values || values.length <= 1) return []

  return values.slice(1).map((row, index) => ({
    rowIndex: index + 2, // +2 because: skip header (1) + 0-based to 1-based (1)
    date: row[0] || '',
    routine: row[1] || '',
    setType: row[2] || '',
    exercise: row[3] || '',
    targetReps: row[4] || '',
    targetWeight: row[5] || '',
    actualReps: row[6] || '',
  }))
}

export async function appendRows(rows: Omit<SheetRow, 'rowIndex'>[]): Promise<void> {
  if (rows.length === 0) return
  const sheets = getSheets()
  const values = rows.map((r) => [r.date, r.routine, r.setType, r.exercise, r.targetReps, r.targetWeight, r.actualReps])
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
}

export async function getExerciseConfig(): Promise<Map<string, ExerciseConfig>> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Config!A:G',
  })
  const values = response.data.values
  if (!values || values.length <= 1) return new Map()

  const map = new Map<string, ExerciseConfig>()
  for (const row of values.slice(1)) {
    if (!row[0]) continue
    const exercise = row[0].toLowerCase()
    const type = (['main', 'accessory', 'bodyweight'].includes(row[3]) ? row[3] : 'accessory') as 'main' | 'accessory' | 'bodyweight'
    const validEquipment = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight']
    const equipment = validEquipment.includes(row[6]) ? row[6] : 'barbell'
    const config: ExerciseConfig = {
      exercise,
      humanReadable: row[4] || row[0], // fall back to raw value if col E is empty
      trainingMax: Number(row[1]) || 0,
      increment: Number(row[2]) || 5,
      type,
      roundTo: Number(row[5]) || 2.5,
      equipment: equipment as ExerciseConfig['equipment'],
    }
    // Compound key: exercise (lowercase) + type
    // bodyweight exercises use 'accessory' in the compound key since they appear as accessories in workouts
    const compoundType = type === 'bodyweight' ? 'accessory' : type
    map.set(`${exercise}::${compoundType}`, config)
    // Plain-name fallback for single-role exercises (last write wins)
    if (!map.has(exercise)) map.set(exercise, config)
  }
  return map
}

export async function updateExerciseTrainingMax(
  exercise: string,
  newTM: number,
  type?: 'main' | 'accessory'
): Promise<void> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Config!A:D',
  })
  const values = response.data.values
  if (!values) return
  const exerciseLower = exercise.toLowerCase()
  const rowIndex = values.findIndex((row) => {
    if (row[0]?.toLowerCase() !== exerciseLower) return false
    if (type) return (row[3] === 'main' ? 'main' : 'accessory') === type
    return true
  })
  if (rowIndex === -1) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Config!B${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[String(newTM)]] },
  })
}

export async function getWorkoutState(): Promise<WorkoutState> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'State!A:B',
  })
  const values = response.data.values
  if (!values || values.length <= 1) return { currentWeek: 1 }
  const map = new Map(values.slice(1).map((row) => [row[0], row[1]]))
  return { currentWeek: Number(map.get('current_week')) || 1 }
}

export async function updateWorkoutState(week: number): Promise<void> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'State!A:A',
  })
  const values = response.data.values
  if (!values) return
  const rowIndex = values.findIndex((row) => row[0] === 'current_week')
  if (rowIndex === -1) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `State!B${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[String(week)]] },
  })
}

export async function getEquipmentConfig(): Promise<EquipmentConfig> {
  const sheets = getSheets()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Equipment!A:B',
  })
  const values = response.data.values
  if (!values || values.length === 0) return { barWeight: 45, dumbbellHandleWeight: 0, plates: [] }

  const map = new Map(values.map((row) => [String(row[0]).trim(), String(row[1]).trim()]))
  const plates: PlateEntry[] = []
  for (const [key, val] of map.entries()) {
    if (key === 'bar_weight' || key === 'dumbbell_handle_weight') continue
    const weight = parseFloat(key)
    const count = parseInt(val, 10)
    if (!isNaN(weight) && !isNaN(count) && count > 0) {
      plates.push({ weight, count })
    }
  }
  plates.sort((a, b) => b.weight - a.weight)

  return {
    barWeight: parseFloat(map.get('bar_weight') ?? '45') || 45,
    dumbbellHandleWeight: parseFloat(map.get('dumbbell_handle_weight') ?? '0') || 0,
    plates,
  }
}

export async function updateCell(
  row: number,
  column: string,
  value: string
): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${column}${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}
