'use client'

import { create } from 'zustand'

export type ViewKey =
  | 'today'
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'recurring'
  | 'categories'
  | 'settings'

type UIState = {
  view: ViewKey
  setView: (v: ViewKey) => void

  dayDrawerDate: string | null
  openDayDrawer: (date: string) => void
  closeDayDrawer: () => void

  shortcutsOpen: boolean
  setShortcutsOpen: (v: boolean) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useUI = create<UIState>((set) => ({
  view: 'today',
  setView: (view) => set({ view }),

  dayDrawerDate: null,
  openDayDrawer: (dayDrawerDate) => set({ dayDrawerDate }),
  closeDayDrawer: () => set({ dayDrawerDate: null }),

  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}))
