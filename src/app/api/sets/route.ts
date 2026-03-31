import { updateCell } from '@/lib/sheets'
import { COLUMN_MAP, type EditableColumn } from '@/lib/types'

export async function PATCH(request: Request) {
  const body = await request.json()
  const { rowIndex, column, value } = body as {
    rowIndex: number
    column: string
    value: string
  }

  if (!(column in COLUMN_MAP)) {
    return Response.json(
      { error: `Invalid column: ${column}` },
      { status: 400 }
    )
  }

  const sheetColumn = COLUMN_MAP[column as EditableColumn]
  await updateCell(rowIndex, sheetColumn, value)

  return Response.json({ success: true })
}
