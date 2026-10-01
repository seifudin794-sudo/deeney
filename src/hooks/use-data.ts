'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TaskInput } from '@/lib/api'

export const qk = {
  me: ['auth', 'me'] as const,
  categories: ['categories'] as const,
  tasks: ['tasks'] as const,
  stats: (params: { from: string; to: string }) => ['stats', params] as const,
}

// ---- Auth ----
export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: () => api.auth.me() })
}
export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.auth.login,
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
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  })
}

// ---- Tasks ----
export function useTasks() {
  return useQuery({ queryKey: qk.tasks, queryFn: api.tasks.list })
}
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tasks })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) => api.tasks.update(id, input),
    onMutate: async ({ id, input }) => {
      const prev = qc.getQueryData<Task[]>(qk.tasks)
      if (prev) {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                name: input.name,
                categoryId: input.categoryId ?? null,
                priority: input.priority ?? t.priority,
                repeatType: input.repeatType ?? t.repeatType,
                startDate: input.startDate,
              }
            : t,
        )
        qc.setQueryData(qk.tasks, next)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.tasks.remove,
    onMutate: async (id) => {
      const prev = qc.getQueryData<Task[]>(qk.tasks)
      if (prev) qc.setQueryData(qk.tasks, prev.filter((t) => t.id !== id))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// ---- Marks ----
export function useSetMark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, dueDate, status, reason }: { taskId: string; dueDate: string; status: 'done' | 'not_done'; reason?: string }) =>
      api.marks.set(taskId, dueDate, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// ---- Stats ----
export function useStats(params: { from: string; to: string }) {
  return useQuery({ queryKey: qk.stats(params), queryFn: () => api.stats.overview(params) })
}
