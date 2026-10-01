import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { addDays, parseDateOnlyStr, todayDateOnly } from '@/lib/date'
import { SKIP_REASON_CHIPS } from '@/lib/types'

const TITLES = [
  'Write product update newsletter',
  'Review pull requests',
  '30 min focused writing block',
  'Reply to investor email',
  'Plan next sprint',
  'Morning workout',
  'Read 20 pages',
  'Publish blog draft',
  'Edit video for channel',
  'Call mom',
  'Weekly review & planning',
  'Update analytics dashboard',
  'Brainstorm content ideas',
  'Grocery run',
  'Inbox zero',
  'Sketch landing page hero',
]

const SKIP_REASONS = SKIP_REASON_CHIPS
const DEMO_CATEGORY = [
  { name: 'Work', color: '#f59e0b' },
  { name: 'Content', color: '#8b5cf6' },
  { name: 'Personal', color: '#14b8a6' },
]

// Seed ~60 days of realistic activity for the current user.
export async function POST() {
  try {
    const user = await requireUser()

    // ensure categories
    const existing = await db.category.findMany({ where: { userId: user.id } })
    if (existing.length === 0) {
      await db.category.createMany({
        data: DEMO_CATEGORY.map((c) => ({ userId: user.id, name: c.name, color: c.color })),
      })
    }
    const cats = await db.category.findMany({ where: { userId: user.id } })
    const catIds = cats.map((c) => c.id)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const subtaskTitles = ['Outline', 'Draft', 'Review', 'Publish']

    for (let i = 59; i >= 0; i--) {
      const day = addDays(today, -i)
      const due = parseDateOnlyStr(day)
      const dow = day.getDay()
      const weekend = dow === 0 || dow === 6
      const count = weekend ? 2 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 3)
      for (let n = 0; n < count; n++) {
        const title = TITLES[(i * 3 + n) % TITLES.length]
        const catId = catIds[(i + n) % catIds.length]
        const priority = (['low', 'medium', 'high'] as const)[(i + n) % 3]
        let status: 'pending' | 'completed' | 'skipped' = 'completed'
        if (i < 59) {
          const r = Math.random()
          if (r > 0.8 && i > 0) status = 'skipped'
          else if (r > 0.68 && i > 0) status = 'pending'
        }
        const withSubs = Math.random() > 0.5
        const subs = withSubs ? subtaskTitles.slice(0, 2 + (n % 3)) : []
        const completedAt = status === 'completed' ? addDays(day, 0) : null
        const skipReason = status === 'skipped' ? SKIP_REASONS[(i + n) % SKIP_REASONS.length] : null
        await db.task.create({
          data: {
            userId: user.id,
            title,
            categoryId: catId,
            priority,
            dueDate: due,
            status,
            completedAt,
            skipReason,
            skipLoggedAt: skipReason ? addDays(day, 0) : null,
            sortOrder: n,
            subtasks: subs.length
              ? {
                  create: subs.map((s, idx) => ({
                    userId: user.id,
                    title: s,
                    sortOrder: idx,
                    isDone: status === 'completed' ? true : Math.random() > 0.5,
                  })),
                }
              : undefined,
          },
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
