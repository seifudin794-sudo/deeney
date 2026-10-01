import {
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Repeat2,
  Settings,
  Sparkles,
  Tag,
  Sun,
} from 'lucide-react'
import { ViewKey } from '@/store/ui'

export const NAV_ITEMS: { key: ViewKey; label: string; icon: any; shortcut: string }[] = [
  { key: 'today', label: 'Today', icon: Sun, shortcut: 'T' },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'D' },
  { key: 'tasks', label: 'All Tasks', icon: ListChecks, shortcut: 'A' },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays, shortcut: 'C' },
  { key: 'recurring', label: 'Recurring', icon: Repeat2, shortcut: '' },
  { key: 'categories', label: 'Categories', icon: Tag, shortcut: '' },
  { key: 'settings', label: 'Settings', icon: Settings, shortcut: '' },
]

export const MOBILE_NAV: ViewKey[] = ['today', 'dashboard', 'tasks', 'calendar']
