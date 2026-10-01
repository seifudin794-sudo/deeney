// Shared domain types — mirror the database schema.
export type Priority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'completed' | 'skipped'
export type RecurrenceRule = 'daily' | 'weekdays' | 'weekly' | 'monthly'

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
  userId: string
  title: string
  isDone: boolean
  doneAt: string | null
  sortOrder: number
  createdAt: string
}

export type Task = {
  id: string
  userId: string
  title: string
  description: string | null
  categoryId: string | null
  priority: Priority
  dueDate: string // YYYY-MM-DD
  status: TaskStatus
  completedAt: string | null
  skipReason: string | null
  skipLoggedAt: string | null
  recurrenceRule: RecurrenceRule | null
  recurrenceWeekdays: string | null
  parentRecurringId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  category?: Category | null
  subtasks: Subtask[]
}

export type RecurringTemplate = {
  id: string
  userId: string
  title: string
  description: string | null
  categoryId: string | null
  priority: Priority
  rule: RecurrenceRule
  weekdays: string | null
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  category?: Category | null
}

export type Settings = {
  theme: 'light' | 'dark' | 'system'
  weekStartsOn: 0 | 1
  timezone: string
  onboardingDone: boolean
}

export type User = {
  id: string
  email: string
  name: string | null
  provider: string
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const SKIP_REASON_CHIPS = [
  'Ran out of time',
  'Low energy',
  'Blocked by someone',
  'Priorities changed',
  'Forgot',
] as const

export type CategoryColor = {
  name: string
  value: string
}

// Curated color options for categories (stored as hex in DB; UI consumes token-like values).
export const CATEGORY_COLORS: CategoryColor[] = [
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Slate', value: '#64748b' },
]
