import { db } from '@/lib/db'
import type { Category, Subtask, SubtaskMark, Task, TaskMark } from '@/lib/types'

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
    title: s.title,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
  }
}

export function serializeTask(t: any): Task {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    categoryId: t.categoryId,
    priority: t.priority,
    repeatType: t.repeatType,
    startDate: t.startDate,
    time: t.time ?? null,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    category: t.category ? serializeCategory(t.category) : null,
    subtasks: (t.subtasks || []).map(serializeSubtask).sort((a: Subtask, b: Subtask) => a.sortOrder - b.sortOrder),
  }
}

export function serializeMark(m: any): TaskMark {
  return {
    id: m.id,
    taskId: m.taskId,
    dueDate: m.dueDate,
    status: m.status,
    reason: m.reason,
    autoMarked: m.autoMarked,
    markedAt: m.markedAt ? m.markedAt.toISOString() : null,
  }
}

export function serializeSubtaskMark(m: any): SubtaskMark {
  return {
    id: m.id,
    subtaskId: m.subtaskId,
    dueDate: m.dueDate,
    status: m.status,
    markedAt: m.markedAt ? m.markedAt.toISOString() : null,
  }
}

export const TASK_INCLUDE = {
  category: true,
  subtasks: { orderBy: { sortOrder: 'asc' as const } },
}
