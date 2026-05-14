/*
Copyright (C) 2023-2026 QuantumNous
*/
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'
import { KPIAdminSubmissions } from '@/features/kpi/pages/admin-submissions'

export const Route = createFileRoute(
  '/_authenticated/kpi/admin/submissions/'
)({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth?.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({ to: '/kpi/tasks' })
    }
  },
  component: KPIAdminSubmissions,
})
