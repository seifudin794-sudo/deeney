import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { addDays, parseDateOnly, parseDateOnlyStr, startOfMonth, startOfWeek, todayDateOnly } from '@/lib/date'

type RangeKey = 'today' | 'week' | 'month' | 'last30' | 'custom'

function getRange(key: RangeKey, customFrom?: string, customTo?: string, weekStartsOn: 0 | 1 = 1) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let from: Date
  let to: Date = new Date(today)
  switch (key) {
    case 'today': from = new Date(today); break
    case 'week': from = startOfWeek(today, weekStartsOn); break
    case 'month': from = startOfMonth(today); break
    case 'last30': from = addDays(today, -29); break
    case 'custom':
      from = customFrom ? parseDateOnly(customFrom) : addDays(today, -6)
      to = customTo ? parseDateOnly(customTo) : new Date(today)
      break
  }
  return { from, to }
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c))
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const rangeKey = (url.searchParams.get('range') || 'last30') as RangeKey
    const settings = await db.settings.findUnique({ where: { userId: user.id } })
    const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1
    const { from, to } = getRange(rangeKey, url.searchParams.get('from') || undefined, url.searchParams.get('to') || undefined, weekStartsOn)
    const catParam = url.searchParams.get('categories')
    const catFilter = catParam ? { categoryId: { in: catParam.split(',').filter(Boolean) } } : {}

    const tasks = await db.task.findMany({
      where: { userId: user.id, dueDate: { gte: parseDateOnlyStr(from), lte: parseDateOnlyStr(to) }, ...catFilter },
      include: { category: true, subtasks: true },
      orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }],
    })

    const completed = tasks.filter((t) => t.status === 'completed').length
    const skipped = tasks.filter((t) => t.status === 'skipped').length
    const total = tasks.length
    const completionRate = total ? Math.round((completed / total) * 100) : 0
    const subDone = tasks.reduce((a, t) => a + t.subtasks.filter((s) => s.isDone).length, 0)

    // daily breakdown
    const dayMap = new Map<string, { done: number; skip: number; pend: number }>()
    for (const t of tasks) {
      if (!dayMap.has(t.dueDate)) dayMap.set(t.dueDate, { done: 0, skip: 0, pend: 0 })
      const e = dayMap.get(t.dueDate)!
      if (t.status === 'completed') e.done++
      else if (t.status === 'skipped') e.skip++
      else e.pend++
    }

    // category breakdown
    const catMap = new Map<string, { name: string; color: string; done: number; total: number }>()
    for (const t of tasks) {
      const k = t.categoryId || 'none'
      if (!catMap.has(k)) catMap.set(k, { name: t.category?.name || 'Uncategorized', color: t.category?.color || '#64748b', done: 0, total: 0 })
      const e = catMap.get(k)!
      e.total++
      if (t.status === 'completed') e.done++
    }

    const skippedTasks = tasks.filter((t) => t.status === 'skipped')

    const rangeLabel = `${parseDateOnlyStr(from)} → ${parseDateOnlyStr(to)}`
    const now = new Date().toLocaleString('en-GB', { timeZone: user ? 'Africa/Nairobi' : undefined })

    const kpiHtml = (label: string, value: string, sub: string) => `
      <div class="kpi">
        <div class="kpi-label">${esc(label)}</div>
        <div class="kpi-value">${esc(value)}</div>
        <div class="kpi-sub">${esc(sub)}</div>
      </div>`

    const kpis = [
      kpiHtml('Tasks completed', String(completed), `of ${total} planned`),
      kpiHtml('Completion rate', `${completionRate}%`, 'this period'),
      kpiHtml('Tasks skipped', String(skipped), total ? `${Math.round((skipped / total) * 100)}% of planned` : '0% of planned'),
      kpiHtml('Subtasks done', String(subDone), 'across all tasks'),
    ].join('')

    const dailyRows = Array.from(dayMap.entries())
      .map(([date, v]) => {
        const rate = v.done + v.skip + v.pend ? Math.round((v.done / (v.done + v.skip + v.pend)) * 100) : 0
        return `<tr><td>${esc(date)}</td><td>${v.done}</td><td>${v.skip}</td><td>${v.pend}</td><td>${rate}%</td></tr>`
      })
      .join('')

    const maxCat = Math.max(1, ...Array.from(catMap.values()).map((c) => c.total))
    const catRows = Array.from(catMap.values())
      .map((c) => {
        const rate = c.total ? Math.round((c.done / c.total) * 100) : 0
        const w = Math.round((c.total / maxCat) * 100)
        return `<tr><td><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</td><td>${c.done}/${c.total}</td><td><div class="bar"><div class="bar-fill" style="width:${rate}%"></div></div></td><td>${rate}%</td></tr>`
      })
      .join('')

    const skipRows = skippedTasks
      .map((t) => `<tr><td>${esc(t.dueDate)}</td><td>${esc(t.title)}</td><td>${esc(t.skipReason || '—')}</td></tr>`)
      .join('') || '<tr><td colspan="3" class="empty">No skipped tasks this period — nicely done.</td></tr>'

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Task Journal Report — ${esc(rangeLabel)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover { border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 24px; }
  .cover h1 { font-size: 30px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .cover .meta { color: #666; font-size: 13px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0 26px; }
  .kpi { border: 1px solid #e6e6e6; border-radius: 12px; padding: 14px; }
  .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
  .kpi-value { font-size: 28px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .kpi-sub { font-size: 11px; color: #999; margin-top: 2px; }
  h2 { font-size: 15px; margin: 28px 0 10px; letter-spacing: -0.01em; border-left: 3px solid #111; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #888; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; border-bottom: 1px solid #e0e0e0; padding: 7px 6px; }
  td { padding: 7px 6px; border-bottom: 1px solid #f1f1f1; font-variant-numeric: tabular-nums; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 7px; vertical-align: middle; }
  .bar { background: #f0f0f0; border-radius: 999px; height: 8px; width: 120px; overflow: hidden; }
  .bar-fill { background: #111; height: 100%; border-radius: 999px; }
  .empty { color: #999; font-style: italic; text-align: center; }
  .actions { position: fixed; top: 14px; right: 14px; }
  .btn { background: #111; color: #fff; border: 0; border-radius: 9px; padding: 9px 14px; font-size: 13px; cursor: pointer; font-weight: 600; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media print { .actions { display: none; } }
</style></head>
<body>
  <div class="actions"><button class="btn" onclick="window.print()">Print / Save as PDF</button></div>
  <div class="cover">
    <h1>Task Journal Report</h1>
    <div class="meta">Range ${esc(rangeLabel)} &nbsp;·&nbsp; generated ${esc(now)} &nbsp;·&nbsp; ${esc(user.email)}</div>
  </div>
  <div class="kpis">${kpis}</div>

  <h2>Daily breakdown</h2>
  <table><thead><tr><th>Date</th><th>Completed</th><th>Skipped</th><th>Pending</th><th>Completion</th></tr></thead>
  <tbody>${dailyRows || '<tr><td colspan="5" class="empty">No tasks in this range.</td></tr>'}</tbody></table>

  <h2>Category breakdown</h2>
  <table><thead><tr><th>Category</th><th>Completed / Total</th><th>Rate</th><th>%</th></tr></thead>
  <tbody>${catRows || '<tr><td colspan="4" class="empty">No categorized tasks.</td></tr>'}</tbody></table>

  <h2>Skipped tasks with reasons</h2>
  <table><thead><tr><th>Date</th><th>Task</th><th>Reason</th></tr></thead>
  <tbody>${skipRows}</tbody></table>
</body></html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
