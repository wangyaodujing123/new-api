/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  getKPITaskDetail,
  getMyKPISubmissions,
  createKPISubmission,
  parseScreenshotUrls,
  getKPIUploadUrl,
  KPI_SUBMISSION_STATUS_LABELS,
  KPI_PERIOD_LABELS,
} from '../api'

export function KPITaskDetail() {
  const { id } = useParams({ from: '/_authenticated/kpi/tasks/$id' })
  const queryClient = useQueryClient()
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const { data: taskData, isLoading: taskLoading } = useQuery({
    queryKey: ['kpi', 'task', id],
    queryFn: () => getKPITaskDetail(Number(id)),
  })

  const { data: submissionsData } = useQuery({
    queryKey: ['kpi', 'submissions', 'self', id],
    queryFn: () => getMyKPISubmissions({ task_id: Number(id), page_size: 50 }),
  })

  const submitMutation = useMutation({
    mutationFn: (formData: FormData) => createKPISubmission(formData),
    onSuccess: () => {
      toast.success('提交成功')
      setDescription('')
      setFiles([])
      queryClient.invalidateQueries({ queryKey: ['kpi'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '提交失败'
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      toast.error('请至少上传一张截图')
      return
    }
    if (!description.trim()) {
      toast.error('请填写说明')
      return
    }

    const formData = new FormData()
    formData.append('task_id', id)
    formData.append('description', description)
    files.forEach((file) => formData.append('screenshots', file))
    submitMutation.mutate(formData)
  }

  const task = taskData?.data?.task
  const submissions = submissionsData?.data?.list ?? []

  if (taskLoading) return <p className="p-6">加载中...</p>
  if (!task) return <p className="p-6">任务不存在</p>

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* 任务信息 */}
      <div className="mb-6 rounded-lg border p-4">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
          <span>{KPI_PERIOD_LABELS[task.period_type]}</span>
          <span>开始: {new Date(task.start_time * 1000).toLocaleDateString()}</span>
          <span>截止: {new Date(task.end_time * 1000).toLocaleDateString()}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm">{task.description}</p>
      </div>

      {/* 提交表单 */}
      {task.status === 1 && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">提交每日记录</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">截图上传</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground"
            />
            {files.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                已选择 {files.length} 个文件
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">使用说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述今天的 AI 使用情况..."
              maxLength={2000}
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {submitMutation.isPending ? '提交中...' : '提交'}
          </button>
        </form>
      )}

      {/* 我的提交历史 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">我的提交记录</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无提交记录</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub: Record<string, unknown>) => (
              <div key={sub.id as number} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {sub.submission_date as string}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      sub.status === 1
                        ? 'bg-green-100 text-green-700'
                        : sub.status === 2
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {KPI_SUBMISSION_STATUS_LABELS[sub.status as number]}
                    {sub.score != null && ` (${sub.score}分)`}
                  </span>
                </div>
                <p className="mt-1 text-sm">{sub.description as string}</p>
                <div className="mt-2 flex gap-2">
                  {parseScreenshotUrls(sub.screenshot_urls as string).map(
                    (url, i) => (
                      <img
                        key={i}
                        src={getKPIUploadUrl(url)}
                        alt={`截图${i + 1}`}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )
                  )}
                </div>
                {sub.review_comment && (
                  <p className="mt-1 text-xs text-red-600">
                    驳回原因: {sub.review_comment as string}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
