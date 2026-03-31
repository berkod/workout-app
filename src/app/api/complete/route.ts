import { getAllRows, updateCell } from '@/lib/sheets'

export async function POST(request: Request) {
  const body = await request.json()
  const { routine } = body as { routine: string }

  const rows = await getAllRows()
  const filtered = rows.filter((row) => row.routine === routine)

  const today = new Date().toISOString().split('T')[0]

  const updates: Promise<void>[] = []
  for (const row of filtered) {
    updates.push(updateCell(row.rowIndex, 'A', today))
    if (!row.actualReps) {
      updates.push(updateCell(row.rowIndex, 'G', '0'))
    }
  }

  await Promise.all(updates)

  return Response.json({ success: true, rowsUpdated: filtered.length })
}
