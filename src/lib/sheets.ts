import { google } from 'googleapis'
import type { SheetRow } from './types'

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
