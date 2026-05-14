/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useQuery } from '@tanstack/react-query'
import {
  getMyKPISubmissions,
  parseScreenshotUrls,
  getKPIUploadUrl,
  KPI_SUBMISSION_STATUS_LABELS,
} from '../api'

export function KPIMySubmissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'submissions', 'self'],
    queryFn: () => getMyKPISubmissions({ page_size: 50 }),
  })

  const submissions = data?.data?.list ?? []

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">我的提交记录</h1>

      {isLoading && <p className="text-muted-foreground">加载中...</p>}

      {!isLoading && submissions.length === 0 && (
        <p className="text-muted-foreground">暂无提交记录</p>
      )}

      <div className="space-y-3">
        {submissions.map((sub: Record<string, unknown>) => (
          <div key={sub.id as number} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
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
            <p className="mt-2 text-sm">{sub.description as string}</p>
            <div className="mt-2 flex gap-2">
              {parseScreenshotUrls(sub.screenshot_urls as string).map(
                (url, i) => (
                  <img
                    key={i}
                    src={getKPIUploadUrl(url)}
                    alt={`截图${i + 1}`}
                    className="h-20 w-20 rounded object-cover"
                  />
                )
              )}
            </div>
            {sub.review_comment && (
              <p className="mt-2 text-xs text-red-600">
                驳回原因: {sub.review_comment as string}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
