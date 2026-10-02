export type Priority = 'low' | 'medium' | 'high'
export type RepeatType = 'daily' | 'every_3_days' | 'weekly'
export type MarkStatus = 'pending' | 'done' | 'not_done'
export type SubtaskStatus = 'pending' | 'done'

export type Category = {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
}

export type Subtask = {
  id: string
  taskId: string
  title: string
  sortOrder: number
  createdAt: string
}

export type Task = {
  id: string
  userId: string
  name: string
  categoryId: string | null
  priority: Priority
  repeatType: RepeatType
  startDate: string // YYYY-MM-DD
  sortOrder: number
  createdAt: string
  updatedAt: string
  category?: Category | null
  subtasks: Subtask[]
}

export type TaskMark = {
  id: string
  taskId: string
  dueDate: string
  status: MarkStatus
  reason: string | null
  autoMarked: boolean
  markedAt: string | null
}

export type SubtaskMark = {
  id: string
  subtaskId: string
  dueDate: string
  status: SubtaskStatus
  markedAt: string | null
}

// A task occurrence for a given date, with its mark resolved.
export type Occurrence = {
  taskId: string
  dueDate: string
  task: Task
  mark: TaskMark
}

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High', color: 'var(--danger)' },
  medium: { label: 'Medium', color: 'var(--warning)' },
  low: { label: 'Low', color: 'var(--text-muted)' },
}

export const REPEAT_META: Record<RepeatType, { label: string }> = {
  daily: { label: 'Daily' },
  every_3_days: { label: 'Every 3 days' },
  weekly: { label: 'Weekly' },
}

export const CATEGORY_COLORS = [
  '#f43f5e', '#f59e0b', '#10b981', '#14b8a6',
  '#8b5cf6', '#d946ef', '#f97316', '#0ea5e9',
  '#84cc16', '#64748b',
]
