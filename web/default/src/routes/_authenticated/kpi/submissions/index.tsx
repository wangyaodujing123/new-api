/*
Copyright (C) 2023-2026 QuantumNous
*/
import { createFileRoute } from '@tanstack/react-router'
import { KPIMySubmissions } from '@/features/kpi/pages/my-submissions'

export const Route = createFileRoute('/_authenticated/kpi/submissions/')({
  component: KPIMySubmissions,
})
