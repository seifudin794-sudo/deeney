'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Check,
  GripVertical,
  MoreHorizontal,
  Pencil,
  SkipForward,
  Copy,
  Trash2,
  ChevronDown,
  Plus,
  CornerDownRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CategoryPill, PriorityMarker, SubtaskProgress } from '@/components/common/task-bits'
import { useToggleComplete, useDeleteTask, useDuplicateTask, useAddSubtask, useToggleSubtask, useDeleteSubtask } from '@/hooks/use-data'
import type { Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false)
  const [newSub, setNewSub] = useState('')
  const [skipOpen, setSkipOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const toggle = useToggleComplete()
  const del = useDeleteTask()
  const dup = useDuplicateTask()
  const addSub = useAddSubtask()
  const toggleSub = useToggleSubtask()
  const delSub = useDeleteSubtask()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const done = task.subtasks.filter((s) => s.isDone).length
  const total = task.subtasks.length
  const isCompleted = task.status === 'completed'

  function addSubtask(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const v = newSub.trim()
    if (!v) return
    addSub.mutate({ taskId: task.id, title: v })
    setNewSub('')
  }

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className={cn(
          'group relative rounded-2xl border bg-surface p-3.5 transition-colors',
          isCompleted ? 'border-border opacity-70' : 'border-border hover:border-primary/30',
          isDragging && 'shadow-lg ring-2 ring-primary/40',
          task.status === 'skipped' && 'border-skipped/30',
        )}
      >
        <div className="flex items-start gap-3">
          {/* drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 hidden cursor-grab touch-none text-text-muted opacity-0 transition group-hover:opacity-100 hover:text-text-primary sm:block active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* checkbox */}
          <button
            onClick={() => toggle.mutate({ id: task.id, completed: !isCompleted })}
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary',
            )}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted && <Check className="animate-check h-3 w-3" strokeWidth={3} />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  'text-sm font-medium leading-snug',
                  isCompleted && 'text-text-muted line-through',
                  task.status === 'skipped' && 'text-text-muted',
                )}
              >
                {task.title}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition hover:bg-muted group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSkipOpen(true)} className="gap-2">
                    <SkipForward className="h-3.5 w-3.5" /> Skip with reason
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dup.mutate(task.id, { onSuccess: () => toast.success('Duplicated') })} className="gap-2">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => del.mutate(task.id, { onSuccess: () => toast.success('Deleted') })}
                    className="gap-2 text-danger focus:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <CategoryPill category={task.category} />
              <PriorityMarker priority={task.priority} />
              {total > 0 && <SubtaskProgress done={done} total={total} />}
              {task.parentRecurringId && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">recurring</span>
              )}
              {total > 0 && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="ml-auto flex items-center gap-0.5 text-[11px] text-text-muted hover:text-text-primary"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
                </button>
              )}
            </div>

            {task.skipReason && (
              <p className="mt-2 rounded-lg bg-skipped/10 px-3 py-2 text-xs italic text-text-secondary">
                Skipped — “{task.skipReason}”
              </p>
            )}

            {expanded && total > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="group/sub flex items-center gap-2.5">
                    <Checkbox
                      checked={s.isDone}
                      onCheckedChange={(v) => toggleSub.mutate({ id: s.id, isDone: !!v })}
                      className="h-4 w-4"
                    />
                    <span className={cn('flex-1 text-xs', s.isDone ? 'text-text-muted line-through' : 'text-text-secondary')}>
                      {s.title}
                    </span>
                    <button
                      onClick={() => delSub.mutate(s.id)}
                      className="text-text-muted opacity-0 transition hover:text-danger group-hover/sub:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
              <CornerDownRight className="h-3 w-3 text-text-muted" />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={addSubtask}
                placeholder="Add a subtask… (Enter)"
                className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
              />
              {newSub.trim() && (
                <button
                  onClick={() => {
                    if (newSub.trim()) {
                      addSub.mutate({ taskId: task.id, title: newSub.trim() })
                      setNewSub('')
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] text-primary"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <SkipInlineWrapper taskId={task.id} title={task.title} open={skipOpen} onOpenChange={setSkipOpen} />
      <TaskEditInlineWrapper task={task} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}

// lazy wrappers to keep import graph light and avoid circular issues
import { SkipDialog } from '@/components/today/skip-dialog'
import { TaskEditDialog } from '@/components/today/task-edit-dialog'
function SkipInlineWrapper(p: { taskId: string; title: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  return <SkipDialog {...p} />
}
function TaskEditInlineWrapper(p: { task: Task; open: boolean; onOpenChange: (v: boolean) => void }) {
  return <TaskEditDialog {...p} />
}
