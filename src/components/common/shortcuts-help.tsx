'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useUI } from '@/store/ui'
import { Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { keys: 'N', desc: 'New task' },
  { keys: 'T', desc: 'Go to Today' },
  { keys: 'D', desc: 'Go to Dashboard' },
  { keys: 'A', desc: 'Go to All Tasks' },
  { keys: 'C', desc: 'Go to Calendar' },
  { keys: '/', desc: 'Focus search' },
  { keys: 'Esc', desc: 'Close modals & drawers' },
  { keys: '?', desc: 'Open this help' },
]

export function ShortcutsHelp() {
  const { shortcutsOpen, setShortcutsOpen } = useUI()
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Move fast without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted">
              <span className="text-sm text-text-secondary">{s.desc}</span>
              <kbd className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-primary">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
