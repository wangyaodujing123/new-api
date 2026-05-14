/*
Copyright (C) 2023-2026 QuantumNous
*/
import { createFileRoute } from '@tanstack/react-router'
import { KPITaskDetail } from '@/features/kpi/pages/task-detail'

export const Route = createFileRoute('/_authenticated/kpi/tasks/$id')({
  component: KPITaskDetail,
})
