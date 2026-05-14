/*
Copyright (C) 2023-2026 QuantumNous
*/
import { createFileRoute } from '@tanstack/react-router'
import { KPITaskList } from '@/features/kpi/pages/task-list'

export const Route = createFileRoute('/_authenticated/kpi/tasks/')({
  component: KPITaskList,
})
