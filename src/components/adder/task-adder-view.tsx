'use client'

import { useState } from 'react'
import { Plus, Trash2, X, CornerDownRight, Loader2, Pencil, Check, Calendar as CalendarIcon, ChevronDown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCategories, useCreateCategory, useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-data'
import { CATEGORY_COLORS, type Priority, type RepeatType } from '@/lib/types'
import { CategoryPill, PriorityPill, RepeatPill } from '@/components/common/bits'
import { EmptyState, LoadingCard } from '@/components/common/states'
import { todayDateOnly, parseDateOnly, formatDateShort } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Task } from '@/lib/types'

const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' }
const REPEATS: RepeatType[] = ['daily', 'every_3_days', 'weekly']
const REPEAT_LABEL: Record<RepeatType, string> = { daily: 'Daily', every_3_days: 'Every 3 days', weekly: 'Weekly' }

type SubtaskDraft = { id?: string; title: string }

export function TaskAdderView() {
  const { data: categories } = useCategories()
  const { data: tasks, isLoading } = useTasks()
  const create = useCreateTask()
  const update = useUpdateTask()
  const del = useDeleteTask()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string>('none')
  const [priority, setPriority] = useState<Priority>('medium')
  const [repeatType, setRepeatType] = useState<RepeatType>('daily')
  const [startDate, setStartDate] = useState<string>(todayDateOnly())
  const [time, setTime] = useState<string>('') // HH:MM, empty = no time
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([])
  const [subInput, setSubInput] = useState('')
  const [calOpen, setCalOpen] = useState(false)
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false) // collapsible options

  const isEditing = !!editingId

  function resetForm() {
    setEditingId(null)
    setName('')
    setCategoryId('none')
    setPriority('medium')
    setRepeatType('daily')
    setStartDate(todayDateOnly())
    setTime('')
    setSubtasks([])
    setSubInput('')
    setOptionsOpen(false)
  }

  function startEdit(t: Task) {
    setEditingId(t.id)
    setName(t.name)
    setCategoryId(t.categoryId || 'none')
    setPriority(t.priority)
    setRepeatType(t.repeatType)
    setStartDate(t.startDate)
    setTime(t.time || '')
    setSubtasks(t.subtasks.map((s) => ({ id: s.id, title: s.title })))
    setSubInput('')
    setOptionsOpen(true) // expand options when editing so all fields are visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addSubtask(e?: React.KeyboardEvent) {
    if (e && e.key !== 'Enter') return
    e?.preventDefault()
    const v = subInput.trim()
    if (!v) return
    setSubtasks((s) => [...s, { title: v }])
    setSubInput('')
  }

  async function submit() {
    if (!name.trim()) {
      toast.error('Task name is required')
      return
    }
    const payload = {
      name: name.trim(),
      categoryId: categoryId === 'none' ? null : categoryId,
      priority,
      repeatType,
      startDate,
      time: time || null,
      subtasks: subtasks.filter((s) => s.title.trim()),
    }
    try {
      if (isEditing && editingId) {
        await update.mutateAsync({ id: editingId, input: payload })
        toast.success('Task updated')
      } else {
        await create.mutateAsync(payload)
        toast.success('Task added')
      }
      resetForm()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await del.mutateAsync(deleteTarget.id)
      toast.success('Task deleted')
      if (editingId === deleteTarget.id) resetForm()
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
          {isEditing ? 'Edit task' : 'Add a task'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">Build a repeatable habit, one task at a time.</p>
      </div>

      {/* FORM */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-4">
          {/* name — always visible */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Task name <span className="text-danger">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning workout"
              className="h-11"
              autoFocus
            />
          </div>

          {/* collapsible options toggle */}
          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm font-medium text-text-soft transition hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-muted" />
              {optionsOpen ? 'Hide options' : 'More options'}
              {(time || categoryId !== 'none' || priority !== 'medium' || repeatType !== 'daily' || subtasks.length > 0) && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', optionsOpen && 'rotate-180')} />
          </button>

          {optionsOpen && (
            <div className="space-y-4">
              {/* time + start date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Time</label>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 focus-within:border-primary">
                    <Clock className="h-4 w-4 text-text-muted" />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-transparent text-sm text-text outline-none"
                    />
                    {time && (
                      <button type="button" onClick={() => setTime('')} className="text-text-muted hover:text-text">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Start date</label>
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-11 w-full gap-2">
                        <CalendarIcon className="h-4 w-4 text-text-muted" />
                        <span className="tnum">{formatDateShort(startDate)}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseDateOnly(startDate)}
                        onSelect={(d) => {
                          if (d) {
                            const y = d.getFullYear()
                            const m = String(d.getMonth() + 1).padStart(2, '0')
                            const day = String(d.getDate()).padStart(2, '0')
                            setStartDate(`${y}-${m}-${day}`)
                            setCalOpen(false)
                          }
                        }}
                        weekStartsOn={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Category</label>
                <div className="flex gap-2">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-11 flex-1">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {(categories || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" className="h-11 gap-1.5" onClick={() => setNewCatOpen(true)}>
                    <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New category</span>
                  </Button>
                </div>
              </div>

              {/* priority */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => {
                    const active = priority === p
                    const color = p === 'high' ? 'var(--danger)' : p === 'medium' ? 'var(--warning)' : 'var(--text-muted)'
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'flex h-11 items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition',
                          active ? 'border-transparent' : 'border-border text-text-muted hover:text-text',
                        )}
                        style={active ? { backgroundColor: color, color: 'white' } : {}}
                      >
                        {active && <Check className="h-4 w-4" />}
                        {PRIORITY_LABEL[p]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* repeat */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Repeat</label>
                <div className="grid grid-cols-3 gap-2">
                  {REPEATS.map((r) => {
                    const active = repeatType === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRepeatType(r)}
                        className={cn(
                          'flex h-11 items-center justify-center rounded-xl border-2 text-sm font-medium transition',
                          active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text',
                        )}
                      >
                        {REPEAT_LABEL[r]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* subtasks */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">Subtasks (optional)</label>
                <div className="rounded-xl border border-border p-3">
                  {subtasks.length > 0 && (
                    <ul className="mb-2 space-y-1.5">
                      {subtasks.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CornerDownRight className="h-3.5 w-3.5 text-text-muted" />
                          <input
                            value={s.title}
                            onChange={(e) => setSubtasks((arr) => arr.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
                            className="flex-1 bg-transparent text-sm text-text outline-none"
                          />
                          <button
                            onClick={() => setSubtasks((arr) => arr.filter((_, idx) => idx !== i))}
                            className="rounded-lg p-1 text-text-muted hover:bg-muted hover:text-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('sub-input') as HTMLInputElement | null
                      el?.focus()
                    }}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium text-primary',
                      subtasks.length === 0 && 'text-text-muted',
                    )}
                  >
                    <Plus className="h-4 w-4" /> Add subtask
                  </button>
                  <input
                    id="sub-input"
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={addSubtask}
                    placeholder="Type a subtask and press Enter…"
                    className="mt-2 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>
            </div>
          )}

          {/* actions — always visible */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={submit} disabled={!name.trim() || create.isPending || update.isPending} className="h-11 flex-1 gap-2 sm:flex-none">
              {(create.isPending || update.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEditing ? 'Update task' : 'Save task'}
            </Button>
            {isEditing && (
              <Button variant="ghost" onClick={resetForm} className="h-11">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SAVED TASKS */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Your tasks</h2>
        {isLoading ? (
          <div className="space-y-2.5">{Array.from({ length: 3 }).map((_, i) => <LoadingCard key={i} />)}</div>
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No tasks yet"
            description="Add your first task using the form above — it'll show up here."
          />
        ) : (
          <div className="space-y-2.5">
            {tasks.map((t) => {
              const editing = editingId === t.id
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 transition',
                    editing ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/30',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{t.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {t.time && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-soft tnum">
                          <Clock className="h-3 w-3" />
                          {formatTime(t.time)}
                        </span>
                      )}
                      <CategoryPill category={t.category} />
                      <PriorityPill priority={t.priority} />
                      <RepeatPill repeatType={t.repeatType} />
                      {t.subtasks.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                          <CornerDownRight className="h-3 w-3" />
                          {t.subtasks.length} subtask{t.subtasks.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => (editing ? resetForm() : startEdit(t))}>
                      {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      {editing ? 'Cancel' : 'Edit'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-danger" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* new category dialog */}
      <NewCategoryDialog open={newCatOpen} onOpenChange={setNewCatOpen} onCreated={(id) => setCategoryId(id)} />

      {/* delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this task?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” and all its history will be permanently removed. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NewCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const create = useCreateCategory()

  async function submit() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      const cat = await create.mutateAsync({ name: name.trim(), color })
      toast.success('Category created')
      onCreated(cat.id)
      setName('')
      setColor(CATEGORY_COLORS[0])
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>Pick a name and a color.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Health" autoFocus />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
              >
                {color === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || create.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convert "14:30" → "2:30 PM" for display.
function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}
