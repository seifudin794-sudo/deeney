'use client'

import { useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Sun, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react'
import { useTasks, useReorderTasks } from '@/hooks/use-data'
import { todayDateOnly } from '@/lib/date'
import { QuickAdd } from '@/components/today/quick-add'
import { TaskCard } from '@/components/today/task-card'
import { LoadingCard } from '@/components/common/states'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function TodayView() {
  const today = todayDateOnly()
  const { data: allTasks, isLoading } = useTasks({ status: 'pending' })
  const { data: todayAndPast } = useTasks({ to: today })
  const reorder = useReorderTasks()
  const [completedCollapsed, setCompletedCollapsed] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const tasks = todayAndPast || []

  const overdue = useMemo(
    () => tasks.filter((t) => t.status === 'pending' && t.dueDate < today).sort(byOrder),
    [tasks, today],
  )
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' && t.dueDate === today).sort(byOrder),
    [tasks, today],
  )
  const completedToday = useMemo(
    () => tasks.filter((t) => t.status === 'completed' && t.dueDate <= today).sort(byOrder).reverse(),
    [tasks, today],
  )

  const streak = useStreak(todayAndPast || [])

  function onDragEnd(e: DragEndEvent, list: typeof todayTasks) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = list.findIndex((t) => t.id === active.id)
    const newIndex = list.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(list, oldIndex, newIndex)
    reorder.mutate(next.map((t) => t.id))
  }

  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-text-muted">{greeting},</p>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5">
            <Flame className="h-4 w-4 text-warning" />
            <span className="text-sm font-semibold text-warning tnum">{streak} day streak</span>
          </div>
        )}
      </div>

      <QuickAdd defaultDate={today} />

      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : tasks.length === 0 && (allTasks || []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sun className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-text-primary">A fresh start</h3>
          <p className="mt-1 text-sm text-text-muted">
            Nothing planned yet. Add your first task above and set the tone for the day.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <Section
              icon={AlertCircle}
              title="Overdue"
              tone="danger"
              count={overdue.length}
            >
              <SortableList list={overdue} onDragEnd={onDragEnd} sensors={sensors} />
            </Section>
          )}

          <Section icon={Sun} title="Today" count={todayTasks.length}>
            {todayTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                No tasks for today. Enjoy the calm — or plan something above.
              </p>
            ) : (
              <SortableList list={todayTasks} onDragEnd={onDragEnd} sensors={sensors} />
            )}
          </Section>

          {completedToday.length > 0 && (
            <Collapsible open={!completedCollapsed} onOpenChange={setCompletedCollapsed}>
              <Section
                icon={CheckCircle2}
                title="Completed"
                tone="success"
                count={completedToday.length}
                collapsible
                collapsed={completedCollapsed}
                onToggle={() => setCompletedCollapsed((c) => !c)}
              >
                <CollapsibleContent>
                  <div className="space-y-2.5">
                    {completedToday.map((t) => (
                      <TaskCard key={t.id} task={t} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Section>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  )
}

function SortableList({
  list,
  onDragEnd,
  sensors,
}: {
  list: any[]
  onDragEnd: (e: DragEndEvent, list: any[]) => void
  sensors: any[]
}) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={(e) => onDragEnd(e, list)}>
      <SortableContext items={list.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">
          <AnimatePresence>
            {list.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  )
}

function Section({
  icon: Icon,
  title,
  count,
  tone = 'default',
  children,
  collapsible,
  collapsed,
  onToggle,
}: {
  icon: any
  title: string
  count?: number
  tone?: 'default' | 'danger' | 'success'
  children: React.ReactNode
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  const toneColor = tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-text-secondary'
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className={cn('h-4 w-4', toneColor)} />
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-muted tnum">{count}</span>
        )}
        {collapsible && (
          <button onClick={onToggle} className="ml-auto text-xs text-text-muted hover:text-text-primary">
            {collapsed ? 'Show' : 'Hide'}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function byOrder(a: { sortOrder: number }, b: { sortOrder: number }) {
  return a.sortOrder - b.sortOrder
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function useStreak(tasks: { dueDate: string; status: string }[]): number {
  const map = new Map<string, { planned: number; completed: number; pending: number }>()
  for (const t of tasks) {
    if (!map.has(t.dueDate)) map.set(t.dueDate, { planned: 0, completed: 0, pending: 0 })
    const e = map.get(t.dueDate)!
    e.planned++
    if (t.status === 'completed') e.completed++
    if (t.status === 'pending') e.pending++
  }
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const key = toDateOnlyLocal(cursor)
    const e = map.get(key)
    if (!e || e.planned === 0) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }
    if (e.completed >= 1 && e.pending === 0) streak++
    else break
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function toDateOnlyLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
