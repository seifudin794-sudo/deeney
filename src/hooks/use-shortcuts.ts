'use client'

import { useEffect } from 'react'
import { useUI } from '@/store/ui'

// Global keyboard shortcuts. Ignores when typing in inputs/textareas/contenteditable.
export function useKeyboardShortcuts(onNewTask: () => void, onSearch: () => void) {
  const { setView, setShortcutsOpen, closeDayDrawer } = useUI()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.tagName === 'SELECT'

      if (e.key === 'Escape') {
        closeDayDrawer()
        setShortcutsOpen(false)
        return
      }

      if (typing) return

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        onSearch()
        return
      }
      const k = e.key.toLowerCase()
      if (k === 'n') {
        e.preventDefault()
        onNewTask()
      } else if (k === 't') {
        setView('today')
      } else if (k === 'd') {
        setView('dashboard')
      } else if (k === 'a') {
        setView('tasks')
      } else if (k === 'c') {
        setView('calendar')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setView, setShortcutsOpen, closeDayDrawer, onNewTask, onSearch])
}
