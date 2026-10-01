'use client'

import { create } from 'zustand'

export type ViewKey = 'dashboard' | 'marker' | 'adder'

type UIState = {
  view: ViewKey
  setView: (v: ViewKey) => void

  // Dashboard side panel: selected task id for history
  historyTaskId: string | null
  setHistoryTaskId: (id: string | null) => void

  theme: 'light' | 'dark' | 'system'
  setTheme: (t: 'light' | 'dark' | 'system') => void
}

export const useUI = create<UIState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),

  historyTaskId: null,
  setHistoryTaskId: (historyTaskId) => set({ historyTaskId }),
}))
