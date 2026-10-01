'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag, Check } from 'lucide-react'
import { useCategories, useUpsertCategory, useDeleteCategory, useTasks } from '@/hooks/use-data'
import { PageHeader, LoadingCard, EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { CATEGORY_COLORS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

export function CategoriesView() {
  const { data, isLoading, error, refetch } = useCategories()
  const { data: tasks } = useTasks()
  const del = useDeleteCategory()

  const stats = (data || []).map((c) => {
    const mine = (tasks || []).filter((t) => t.categoryId === c.id)
    const completed = mine.filter((t) => t.status === 'completed').length
    return { cat: c, total: mine.length, completed, rate: mine.length ? Math.round((completed / mine.length) * 100) : 0 }
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Categories" subtitle="Tag your tasks. Each gets its own color and completion rate.">
        <CategoryFormDialog trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New category</Button>} />
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <LoadingCard key={i} />)}</div>
      ) : error ? (
        <ErrorState message="Couldn't load categories." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Tag} title="No categories yet" description="Create a few like Work, Content, Personal to organize your tasks."
          action={<CategoryFormDialog trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Create one</Button>} />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ cat, total, completed, rate }) => (
            <div key={cat.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: cat.color }}>
                    <Tag className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{cat.name}</p>
                    <p className="tnum text-[11px] text-text-muted">{total} tasks · {completed} done</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <CategoryFormDialog category={cat} trigger={<button className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-text-primary"><Pencil className="h-3.5 w-3.5" /></button>} />
                  <button onClick={() => del.mutate(cat.id, { onSuccess: () => toast.success('Deleted') })} className="rounded-lg p-1.5 text-text-muted hover:bg-muted hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-text-muted">
                  <span>Completion</span>
                  <span className="tnum font-medium text-text-primary">{rate}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryFormDialog({ category, trigger }: { category?: Category; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0].value)
  const save = useUpsertCategory()

  function sync() {
    setName(category?.name || '')
    setColor(category?.color || CATEGORY_COLORS[0].value)
  }

  async function submit() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      await save.mutateAsync({ id: category?.id, name: name.trim(), color })
      toast.success(category ? 'Category updated' : 'Category created')
      setOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <div onClick={() => { sync(); setOpen(true) }}>{trigger}</div>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) sync() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>Give it a name and a color.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work" className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-text-primary outline-none focus:border-primary" />
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">Color</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition', color === c.value ? 'ring-2 ring-offset-2 ring-offset-background' : '')}
                    style={{ backgroundColor: c.value, boxShadow: color === c.value ? `0 0 0 2px ${c.value}` : 'none' }}
                  >
                    {color === c.value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!name.trim() || save.isPending}>{category ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
