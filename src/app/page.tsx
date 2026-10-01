'use client'

import { useMe } from '@/hooks/use-data'
import { AuthScreen } from '@/components/auth/auth-screen'
import { AppShell } from '@/components/layout/app-shell'
import { CheckSquare } from 'lucide-react'

export default function Page() {
  const { data, isLoading } = useMe()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CheckSquare className="h-6 w-6" />
        </div>
      </div>
    )
  }

  if (!data?.user) return <AuthScreen />
  return <AppShell />
}
