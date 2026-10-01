import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeCategory } from '@/lib/serialize'

export async function GET() {
  try {
    const user = await requireUser()
    const list = await db.category.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(list.map(serializeCategory))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { name, color } = await req.json()
    if (!name || !String(name).trim()) throw new ResponseError(400, 'Name is required')
    if (!color) throw new ResponseError(400, 'Color is required')
    const cat = await db.category.create({
      data: { userId: user.id, name: String(name).trim(), color: String(color) },
    })
    return NextResponse.json(serializeCategory(cat))
  } catch (e) {
    return errorResponse(e)
  }
}
