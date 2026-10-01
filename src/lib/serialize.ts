import { db } from '@/lib/db'
import type { Category, RecurringTemplate, Subtask, Task } from '@/lib/types'

export function serializeCategory(c: any): Category {
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    color: c.color,
    createdAt: c.createdAt.toISOString(),
  }
}

export function serializeSubtask(s: any): Subtask {
  return {
    id: s.id,
    taskId: s.taskId,
    userId: s.userId,
    title: s.title,
    isDone: s.isDone,
    doneAt: s.doneAt ? s.doneAt.toISOString() : null,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
  }
}

export function serializeTask(t: any): Task {
  return {
    id: t.id,
    userId: t.userId,
    title: t.title,
    description: t.description,
    categoryId: t.categoryId,
    priority: t.priority,
    dueDate: t.dueDate,
    status: t.status,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    skipReason: t.skipReason,
    skipLoggedAt: t.skipLoggedAt ? t.skipLoggedAt.toISOString() : null,
    recurrenceRule: t.recurrenceRule,
    recurrenceWeekdays: t.recurrenceWeekdays,
    parentRecurringId: t.parentRecurringId,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    category: t.category ? serializeCategory(t.category) : null,
    subtasks: (t.subtasks || []).map(serializeSubtask).sort((a: Subtask, b: Subtask) => a.sortOrder - b.sortOrder),
  }
}

export function serializeRecurring(r: any): RecurringTemplate {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    description: r.description,
    categoryId: r.categoryId,
    priority: r.priority,
    rule: r.rule,
    weekdays: r.weekdays,
    startDate: r.startDate,
    endDate: r.endDate,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    category: r.category ? serializeCategory(r.category) : null,
  }
}

export const TASK_INCLUDE = {
  category: true,
  subtasks: { orderBy: { sortOrder: 'asc' as const } },
}
