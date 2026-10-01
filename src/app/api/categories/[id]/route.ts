import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeCategory } from '@/lib/serialize'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const { name, color } = await req.json()
    const cat = await db.category.findUnique({ where: { id } })
    if (!cat || cat.userId !== user.id) throw new ResponseError(404, 'Category not found')
    const updated = await db.category.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(color !== undefined ? { color: String(color) } : {}),
      },
    })
    return NextResponse.json(serializeCategory(updated))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const cat = await db.category.findUnique({ where: { id } })
    if (!cat || cat.userId !== user.id) throw new ResponseError(404, 'Category not found')
    await db.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
