/*
Copyright (C) 2023-2026 QuantumNous
*/
import { api } from '@/lib/api'

const API_BASE = '/api/kpi'

// ============ Types ============

export interface KPITask {
  id: number
  title: string
  description: string
  period_type: 'weekly' | 'monthly'
  start_time: number
  end_time: number
  status: number // 1=active, 2=completed, 3=archived
  created_by: number
  created_at: number
  updated_at: number
}

export interface KPISubmission {
  id: number
  task_id: number
  user_id: number
  screenshot_urls: string // JSON array
  description: string
  submission_date: string
  status: number // 0=pending, 1=approved, 2=rejected
  score: number | null
  reviewer_id: number | null
  review_time: number | null
  review_comment: string
  created_at: number
  updated_at: number
}

export interface KPISubmissionStats {
  total_count: number
  approved_count: number
  rejected_count: number
  pending_count: number
}

export interface KPIUserStats {
  user_id: number
  username: string
  submit_count: number
  approved_count: number
  rejected_count: number
  pending_count: number
  average_score: number
  completion_rate: number
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
}

// ============ User APIs ============

export async function getActiveKPITasks(page = 1, pageSize = 10) {
  const res = await api.get(`${API_BASE}/task/active`, {
    params: { page, page_size: pageSize },
  })
  return res.data
}

export async function getKPITaskDetail(id: number) {
  const res = await api.get(`${API_BASE}/task/${id}`)
  return res.data
}

export async function createKPISubmission(formData: FormData) {
  const res = await api.post(`${API_BASE}/submission`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getMyKPISubmissions(params: {
  page?: number
  page_size?: number
  task_id?: number
  status?: number
}) {
  const res = await api.get(`${API_BASE}/submission/self`, { params })
  return res.data
}

// ============ Admin APIs ============

export async function createKPITask(data: {
  title: string
  description: string
  period_type: string
  start_time: number
  end_time: number
}) {
  const res = await api.post(`${API_BASE}/task`, data)
  return res.data
}

export async function getAllKPITasks(params: {
  page?: number
  page_size?: number
  status?: number
  period_type?: string
}) {
  const res = await api.get(`${API_BASE}/task`, { params })
  return res.data
}

export async function updateKPITask(
  id: number,
  data: Partial<{
    title: string
    description: string
    period_type: string
    start_time: number
    end_time: number
  }>
) {
  const res = await api.put(`${API_BASE}/task/${id}`, data)
  return res.data
}

export async function updateKPITaskStatus(id: number, status: number) {
  const res = await api.put(`${API_BASE}/task/${id}/status`, { status })
  return res.data
}

export async function deleteKPITask(id: number) {
  const res = await api.delete(`${API_BASE}/task/${id}`)
  return res.data
}

export async function getAllKPISubmissions(params: {
  page?: number
  page_size?: number
  task_id?: number
  user_id?: number
  status?: number
  start_date?: string
  end_date?: string
}) {
  const res = await api.get(`${API_BASE}/submission`, { params })
  return res.data
}

export async function reviewKPISubmission(
  id: number,
  data: { action: 'approve' | 'reject'; score?: number; comment?: string }
) {
  const res = await api.post(`${API_BASE}/submission/${id}/review`, data)
  return res.data
}

export async function updateKPISubmissionScore(id: number, score: number) {
  const res = await api.put(`${API_BASE}/submission/${id}/score`, { score })
  return res.data
}

export async function getKPITaskStats(id: number) {
  const res = await api.get(`${API_BASE}/task/${id}/stats`)
  return res.data
}

export async function getKPITaskRanking(id: number, page = 1, pageSize = 10) {
  const res = await api.get(`${API_BASE}/task/${id}/ranking`, {
    params: { page, page_size: pageSize },
  })
  return res.data
}

// ============ Helpers ============

export function getKPIUploadUrl(path: string): string {
  return `${API_BASE}/uploads/${path}`
}

export function parseScreenshotUrls(jsonStr: string): string[] {
  try {
    return JSON.parse(jsonStr) as string[]
  } catch {
    return []
  }
}

export const KPI_TASK_STATUS = {
  ACTIVE: 1,
  COMPLETED: 2,
  ARCHIVED: 3,
} as const

export const KPI_SUBMISSION_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

export const KPI_TASK_STATUS_LABELS: Record<number, string> = {
  1: '进行中',
  2: '已结束',
  3: '已归档',
}

export const KPI_SUBMISSION_STATUS_LABELS: Record<number, string> = {
  0: '待审核',
  1: '已通过',
  2: '已驳回',
}

export const KPI_PERIOD_LABELS: Record<string, string> = {
  weekly: '每周',
  monthly: '每月',
}