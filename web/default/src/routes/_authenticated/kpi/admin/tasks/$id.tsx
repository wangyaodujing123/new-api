/*
Copyright (C) 2023-2026 QuantumNous
*/
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'
import { KPIAdminTaskDetail } from '@/features/kpi/pages/admin-task-detail'

export const Route = createFileRoute('/_authenticated/kpi/admin/tasks/$id')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth?.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({ to: '/kpi/tasks' })
    }
  },
  component: KPIAdminTaskDetail,
})
