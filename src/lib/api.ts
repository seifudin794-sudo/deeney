import type { Category, MarkStatus, Priority, RepeatType, Subtask, Task, TaskMark, User } from '@/lib/types'

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
export type TaskInput = {
  name: string
  categoryId?: string | null
  priority?: Priority
  repeatType?: RepeatType
  startDate: string
  subtasks?: { id?: string; title: string }[]
}
export const tasks = {
  list: () => req<Task[]>('/api/tasks'),
  create: (body: TaskInput) => req<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: TaskInput) => req<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => req<{ ok: true }>(`/api/tasks/${id}`, { method: 'DELETE' }),
}

// ---------- Marks ----------
export type MarkInput = { status: MarkStatus; reason?: string }
export const marks = {
  // Mark a task for a given due date (creates the mark if missing).
  set: (taskId: string, dueDate: string, body: MarkInput) =>
    req<TaskMark>(`/api/marks?taskId=${taskId}&date=${dueDate}`, { method: 'POST', body: JSON.stringify(body) }),
}

// ---------- Stats ----------
export const stats = {
  overview: (params: { from: string; to: string }) => {
    const p = new URLSearchParams({ from: params.from, to: params.to })
    return req<any>(`/api/stats?${p.toString()}`)
  },
}

export const api = { auth, categories, tasks, marks, stats }
