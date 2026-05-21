import { getEquipmentConfig } from '@/lib/sheets'

export async function GET() {
  const config = await getEquipmentConfig()
  return Response.json(config)
}
