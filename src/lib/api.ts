import type { Category, RecurringTemplate, Settings, Task, User } from '@/lib/types'

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  })
  if (!res.ok) {
    let msg = 'Something went wrong'
    try {
      const j = await res.json()
      msg = j.error || msg
    } catch {}
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---------- Auth ----------
export const auth = {
  me: () => req<{ user: User | null }>('/api/auth/me'),
  register: (body: { email: string; password: string; name?: string }) =>
    req<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    req<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  google: () => req<{ user: User }>('/api/auth/google', { method: 'POST' }),
  logout: () => req<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
}

// ---------- Categories ----------
export const categories = {
  list: () => req<Category[]>('/api/categories'),
  create: (body: { name: string; color: string }) =>
    req<Category>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; color?: string }) =>
    req<Category>(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => req<{ ok: true }>(`/api/categories/${id}`, { method: 'DELETE' }),
}

// ---------- Tasks ----------
export type TaskFilter = {
  from?: string
  to?: string
  status?: string
  categoryId?: string
  priority?: string
  q?: string
  recurring?: 'true' | 'false'
}
export const tasks = {
  list: (filter: TaskFilter = {}) => {
    const p = new URLSearchParams()
    Object.entries(filter).forEach(([k, v]) => v && p.set(k, String(v)))
    const qs = p.toString()
    return req<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`)
  },
  create: (body: {
    title: string
    description?: string
    categoryId?: string | null
    priority?: string
    dueDate: string
    recurrenceRule?: string | null
    recurrenceWeekdays?: string | null
    subtasks?: string[]
  }) => req<Task | { ok: true; recurring: true }>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Task>) =>
    req<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => req<{ ok: true }>(`/api/tasks/${id}`, { method: 'DELETE' }),
  complete: (id: string, completed: boolean) =>
    req<Task>(`/api/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify({ completed }) }),
  skip: (id: string, reason: string, rescheduleTo?: string) =>
    req<{ task: Task; copy: Task | null }>(`/api/tasks/${id}/skip`, {
      method: 'POST',
      body: JSON.stringify({ reason, rescheduleTo }),
    }),
  duplicate: (id: string) => req<Task>(`/api/tasks/${id}/duplicate`, { method: 'POST' }),
  reorder: (ids: string[]) =>
    req<{ ok: true }>('/api/tasks/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
}

// ---------- Subtasks ----------
export const subtasks = {
  create: (taskId: string, title: string) =>
    req<import('@/lib/types').Subtask>(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  update: (taskId: string, body: { title?: string; ids?: string[] }) =>
    req<unknown>(`/api/tasks/${taskId}/subtasks`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggle: (id: string, isDone: boolean) =>
    req<import('@/lib/types').Subtask>(`/api/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify({ isDone }) }),
  remove: (id: string) => req<{ ok: true }>(`/api/subtasks/${id}`, { method: 'DELETE' }),
}

// ---------- Recurring ----------
export const recurring = {
  list: () => req<RecurringTemplate[]>('/api/recurring'),
  create: (body: Partial<RecurringTemplate>) =>
    req<RecurringTemplate>('/api/recurring', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<RecurringTemplate>) =>
    req<RecurringTemplate>(`/api/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => req<{ ok: true }>(`/api/recurring/${id}`, { method: 'DELETE' }),
  generate: () => req<{ ok: true; generated: number }>('/api/recurring/generate', { method: 'POST' }),
}

// ---------- Stats ----------
export const stats = {
  overview: (params: { range?: string; from?: string; to?: string; categories?: string }) => {
    const p = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && p.set(k, String(v)))
    return req<any>(`/api/stats?${p.toString()}`)
  },
  day: (date: string) => req<{ tasks: Task[] }>(`/api/stats/day?date=${date}`),
  heatmap: () => req<{ date: string; completed: number; skipped: number; pending: number }[]>('/api/stats/heatmap'),
}

// ---------- Settings ----------
export const settingsApi = {
  get: () => req<Settings>('/api/settings'),
  update: (body: Partial<Settings>) =>
    req<Settings>('/api/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  loadDemo: () => req<{ ok: true }>('/api/settings/demo-load', { method: 'POST' }),
  clearDemo: () => req<{ ok: true }>('/api/settings/demo-clear', { method: 'POST' }),
}

export const exportUrl = {
  csv: (filter: TaskFilter) => {
    const p = new URLSearchParams()
    Object.entries(filter).forEach(([k, v]) => v && p.set(k, String(v)))
    return `/api/export/csv?${p.toString()}`
  },
  pdf: (params: { range?: string; from?: string; to?: string; categories?: string }) => {
    const p = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && p.set(k, String(v)))
    return `/api/export/pdf?${p.toString()}`
  },
}

// Aggregate namespace for convenience in hooks.
export const api = {
  auth,
  categories,
  tasks,
  subtasks,
  recurring,
  stats,
  settings: settingsApi,
}
