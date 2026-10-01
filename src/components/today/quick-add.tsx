'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  CalendarClock,
  Tag,
  Flag,
  Repeat2,
  Plus,
  CornerDownRight,
  Loader2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import { useCategories, useCreateTask } from '@/hooks/use-data'
import { todayDateOnly, parseDateOnly, toDateOnly } from '@/lib/date'
import type { Priority, RecurrenceRule } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function QuickAdd({ defaultDate }: { defaultDate: string }) {
  const [title, setTitle] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(defaultDate)
  const [categoryId, setCategoryId] = useState('none')
  const [priority, setPriority] = useState<Priority>('medium')
  const [rule, setRule] = useState<RecurrenceRule | 'none'>('none')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [subInput, setSubInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: categories } = useCategories()
  const create = useCreateTask()

  useEffect(() => {
    function focus() {
      inputRef.current?.focus()
    }
    window.addEventListener('app:new-task', focus)
    return () => window.removeEventListener('app:new-task', focus)
  }, [])

  function reset() {
    setTitle('')
    setDescription('')
    setDueDate(defaultDate)
    setCategoryId('none')
    setPriority('medium')
    setRule('none')
    setWeekdays([])
    setSubtasks([])
    setSubInput('')
    setExpanded(false)
  }

  async function submit() {
    const t = title.trim()
    if (!t) return
    try {
      await create.mutateAsync({
        title: t,
        description: description || undefined,
        categoryId: categoryId === 'none' ? null : categoryId,
        priority,
        dueDate,
        recurrenceRule: rule === 'none' ? null : rule,
        recurrenceWeekdays: rule === 'weekdays' ? weekdays.join(',') : null,
        subtasks: subtasks,
      })
      toast.success(rule !== 'none' ? 'Recurring task created' : 'Task added')
      reset()
      inputRef.current?.focus()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function addSubtask(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const v = subInput.trim()
    if (!v) return
    setSubtasks((s) => [...s, v])
    setSubInput('')
  }

  const hasExtras = description || dueDate !== defaultDate || categoryId !== 'none' || priority !== 'medium' || rule !== 'none' || subtasks.length

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Plus className="h-5 w-5" />
        </div>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task for today… press Enter"
          className="w-full bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-muted"
        />
        {hasExtras && (
          <button onClick={reset} className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text-primary" title="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn('rounded-lg p-1.5 text-text-muted transition hover:bg-muted hover:text-text-primary', expanded && 'bg-muted text-text-primary')}
          title="More options"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description / notes (optional)"
                rows={2}
                className="resize-none text-sm"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:bg-muted">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span className="tnum">{formatDate(dueDate)}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ? parseDateOnly(dueDate) : undefined}
                      onSelect={(d) => d && setDueDate(toDateOnly(d))}
                      weekStartsOn={1}
                    />
                  </PopoverContent>
                </Popover>

                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-8 w-[130px] gap-1.5 text-xs">
                    <Tag className="h-3.5 w-3.5 text-text-muted" />
                    <SelectValue placeholder="Category" />
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

                <div className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1">
                  <Flag className="h-3.5 w-3.5 text-text-muted" />
                  <ToggleGroup type="single" value={priority} onValueChange={(v) => v && setPriority(v as Priority)} className="gap-0.5">
                    <ToggleGroupItem value="low" className="h-6 px-1.5 text-[11px]">L</ToggleGroupItem>
                    <ToggleGroupItem value="medium" className="h-6 px-1.5 text-[11px]">M</ToggleGroupItem>
                    <ToggleGroupItem value="high" className="h-6 px-1.5 text-[11px]">H</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Select value={rule} onValueChange={(v) => setRule(v as RecurrenceRule | 'none')}>
                  <SelectTrigger className="h-8 w-[140px] gap-1.5 text-xs">
                    <Repeat2 className="h-3.5 w-3.5 text-text-muted" />
                    <SelectValue placeholder="Repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Specific days</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rule === 'weekdays' && (
                <div className="flex items-center gap-1">
                  {WEEKDAYS.map((w, i) => {
                    const active = weekdays.includes(i)
                    return (
                      <button
                        key={i}
                        onClick={() => setWeekdays((a) => (active ? a.filter((x) => x !== i) : [...a, i].sort()))}
                        className={cn(
                          'flex h-8 w-10 items-center justify-center rounded-lg border text-[11px] font-medium transition',
                          active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text-primary',
                        )}
                      >
                        {w}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* subtasks */}
              <div className="rounded-lg border border-border p-2.5">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">Subtasks</p>
                {subtasks.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {subtasks.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                        <CornerDownRight className="h-3 w-3 text-text-muted" />
                        <span className="flex-1">{s}</span>
                        <button onClick={() => setSubtasks((a) => a.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-danger">
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-2">
                  <CornerDownRight className="h-3 w-3 text-text-muted" />
                  <input
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={addSubtask}
                    placeholder="Add a subtask… (Enter for next)"
                    className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={submit}
                  disabled={!title.trim() || create.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add task
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatDate(date: string): string {
  if (!date) return 'No date'
  return parseDateOnly(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
