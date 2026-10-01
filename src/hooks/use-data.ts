'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tasks as tasksApi, subtasks as subtasksApi } from '@/lib/api'
import type { Task } from '@/lib/types'

export const qk = {
  me: ['auth', 'me'] as const,
  categories: ['categories'] as const,
  tasks: (filter?: object) => ['tasks', filter ?? {}] as const,
  recurring: ['recurring'] as const,
  stats: (params: object) => ['stats', params] as const,
  heatmap: ['heatmap'] as const,
  settings: ['settings'] as const,
  dayTasks: (date: string) => ['day-tasks', date] as const,
}

// ---- Auth ----
export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: () => api.auth.me() })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { email: string; password: string }) => api.auth.login(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  })
}
export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.auth.register,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  })
}
export function useGoogle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.auth.google,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  })
}
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => qc.clear(),
  })
}

// ---- Categories ----
export function useCategories() {
  return useQuery({ queryKey: qk.categories, queryFn: api.categories.list })
}
export function useUpsertCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: string; name: string; color: string }) =>
      v.id ? api.categories.update(v.id, { name: v.name, color: v.color }) : api.categories.create({ name: v.name, color: v.color }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  })
}
export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.categories.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ---- Tasks ----
export function useTasks(filter: object = {}) {
  return useQuery({ queryKey: qk.tasks(filter), queryFn: () => tasksApi.list(filter) })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: qk.recurring })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: qk.heatmap })
      qc.invalidateQueries({ queryKey: ['day-tasks'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) => tasksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      const keys = qc.getQueriesData({ queryKey: ['tasks'] }) as [unknown, Task[]][]
      for (const [key, value] of keys) {
        if (!Array.isArray(value)) continue
        const next = value.map((t) => (t.id === id ? { ...t, ...patch } : t))
        qc.setQueryData(key, next)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useToggleComplete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => tasksApi.complete(id, completed),
    onMutate: async ({ id, completed }) => {
      const keys = qc.getQueriesData({ queryKey: ['tasks'] }) as [unknown, Task[]][]
      for (const [key, value] of keys) {
        if (!Array.isArray(value)) continue
        const next = value.map((t) =>
          t.id === id
            ? { ...t, status: completed ? 'completed' : 'pending', completedAt: completed ? new Date().toISOString() : null }
            : t,
        )
        qc.setQueryData(key, next)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: qk.heatmap })
      qc.invalidateQueries({ queryKey: ['day-tasks'] })
    },
  })
}

export function useSkipTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, rescheduleTo }: { id: string; reason: string; rescheduleTo?: string }) =>
      tasksApi.skip(id, reason, rescheduleTo),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: qk.heatmap })
      qc.invalidateQueries({ queryKey: ['day-tasks'] })
      qc.invalidateQueries({ queryKey: qk.recurring })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.remove,
    onMutate: async (id) => {
      const keys = qc.getQueriesData({ queryKey: ['tasks'] }) as [unknown, Task[]][]
      for (const [key, value] of keys) {
        if (!Array.isArray(value)) continue
        qc.setQueryData(key, value.filter((t) => t.id !== id))
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: qk.heatmap })
    },
  })
}

export function useDuplicateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.duplicate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.reorder,
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ---- Subtasks ----
export function useAddSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) => subtasksApi.create(taskId, title),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['day-tasks'] })
    },
  })
}
export function useToggleSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) => subtasksApi.toggle(id, isDone),
    onMutate: async ({ id, isDone }) => {
      const keys = qc.getQueriesData({ queryKey: ['tasks'] }) as [unknown, Task[]][]
      for (const [key, value] of keys) {
        if (!Array.isArray(value)) continue
        const next = value.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === id ? { ...s, isDone, doneAt: isDone ? new Date().toISOString() : null } : s)),
        }))
        qc.setQueryData(key, next)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['day-tasks'] })
    },
  })
}
export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: subtasksApi.remove,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['day-tasks'] })
    },
  })
}
export function useReorderSubtasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, ids }: { taskId: string; ids: string[] }) => subtasksApi.update(taskId, { ids }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ---- Recurring ----
export function useRecurring() {
  return useQuery({ queryKey: qk.recurring, queryFn: api.recurring.list })
}
export function useSaveRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: string; data: Record<string, unknown> }) =>
      v.id ? api.recurring.update(v.id, v.data) : api.recurring.create(v.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recurring })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
export function useDeleteRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.recurring.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recurring }),
  })
}
export function useGenerateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.recurring.generate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: qk.recurring })
    },
  })
}

// ---- Stats ----
export function useStats(params: { range?: string; from?: string; to?: string; categories?: string }) {
  return useQuery({ queryKey: qk.stats(params), queryFn: () => api.stats.overview(params) })
}
export function useHeatmap() {
  return useQuery({ queryKey: qk.heatmap, queryFn: api.stats.heatmap })
}
export function useDayTasks(date: string | null) {
  return useQuery({
    queryKey: qk.dayTasks(date || ''),
    queryFn: () => api.stats.day(date!),
    enabled: !!date,
  })
}

// ---- Settings ----
export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: api.settings.get })
}
export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.settings.update,
    onSuccess: (data) => qc.setQueryData(qk.settings, data),
  })
}
export function useLoadDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.settings.loadDemo,
    onSuccess: () => qc.invalidateQueries(),
  })
}
export function useClearDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.settings.clearDemo,
    onSuccess: () => qc.invalidateQueries(),
  })
}
