/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAllKPISubmissions,
  reviewKPISubmission,
  updateKPISubmissionScore,
  parseScreenshotUrls,
  getKPIUploadUrl,
  KPI_SUBMISSION_STATUS_LABELS,
  type KPISubmission,
} from '../api'

export function KPIAdminSubmissions() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState(-1)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [reviewScore, setReviewScore] = useState('')
  const [reviewComment, setReviewComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'admin', 'submissions', statusFilter],
    queryFn: () =>
      getAllKPISubmissions({
        page_size: 50,
        status: statusFilter >= 0 ? statusFilter : undefined,
      }),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      reviewKPISubmission(id, {
        action,
        score: reviewScore ? Number(reviewScore) : undefined,
        comment: reviewComment || undefined,
      }),
    onSuccess: () => {
      toast.success('审核完成')
      setReviewingId(null)
      setReviewScore('')
      setReviewComment('')
      queryClient.invalidateQueries({ queryKey: ['kpi'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败'
      toast.error(msg)
    },
  })

  const scoreMutation = useMutation({
    mutationFn: ({ id, score }: { id: number; score: number }) =>
      updateKPISubmissionScore(id, score),
    onSuccess: () => {
      toast.success('评分更新成功')
      queryClient.invalidateQueries({ queryKey: ['kpi'] })
    },
  })

  const submissions: KPISubmission[] = data?.data?.list ?? []

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">提交审核</h1>

      {/* 筛选 */}
      <div className="mb-4 flex gap-2">
        {[
          { label: '全部', value: -1 },
          { label: '待审核', value: 0 },
          { label: '已通过', value: 1 },
          { label: '已驳回', value: 2 },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded px-3 py-1 text-sm ${
              statusFilter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">加载中...</p>}

      <div className="space-y-4">
        {submissions.map((sub) => (
          <div key={sub.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  用户 #{sub.user_id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {sub.submission_date}
                </span>
                <span className="text-xs text-muted-foreground">
                  任务 #{sub.task_id}
                </span>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  sub.status === 1
                    ? 'bg-green-100 text-green-700'
                    : sub.status === 2
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {KPI_SUBMISSION_STATUS_LABELS[sub.status]}
                {sub.score != null && ` (${sub.score}分)`}
              </span>
            </div>

            <p className="mt-2 text-sm">{sub.description}</p>

            <div className="mt-2 flex gap-2">
              {parseScreenshotUrls(sub.screenshot_urls).map((url, i) => (
                <a
                  key={i}
                  href={getKPIUploadUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={getKPIUploadUrl(url)}
                    alt={`截图${i + 1}`}
                    className="h-20 w-20 rounded object-cover hover:opacity-80"
                  />
                </a>
              ))}
            </div>

            {/* 审核操作 */}
            {sub.status === 0 && (
              <div className="mt-3 border-t pt-3">
                {reviewingId === sub.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="评分 (0-100)"
                        value={reviewScore}
                        onChange={(e) => setReviewScore(e.target.value)}
                        className="w-24 rounded border px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="驳回原因（驳回时必填）"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="flex-1 rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          reviewMutation.mutate({ id: sub.id, action: 'approve' })
                        }
                        disabled={reviewMutation.isPending}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => {
                          if (!reviewComment.trim()) {
                            toast.error('驳回时必须填写原因')
                            return
                          }
                          reviewMutation.mutate({ id: sub.id, action: 'reject' })
                        }}
                        disabled={reviewMutation.isPending}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white"
                      >
                        驳回
                      </button>
                      <button
                        onClick={() => setReviewingId(null)}
                        className="rounded bg-gray-200 px-3 py-1 text-xs"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReviewingId(sub.id)}
                    className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
                  >
                    审核
                  </button>
                )}
              </div>
            )}

            {/* 已通过的可以修改分数 */}
            {sub.status === 1 && (
              <div className="mt-2">
                <button
                  onClick={() => {
                    const newScore = prompt('输入新分数 (0-100)', String(sub.score ?? ''))
                    if (newScore !== null && !isNaN(Number(newScore))) {
                      scoreMutation.mutate({ id: sub.id, score: Number(newScore) })
                    }
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  修改评分
                </button>
              </div>
            )}
          </div>
        ))}

        {!isLoading && submissions.length === 0 && (
          <p className="text-center text-muted-foreground">暂无提交记录</p>
        )}
      </div>
    </div>
  )
}
