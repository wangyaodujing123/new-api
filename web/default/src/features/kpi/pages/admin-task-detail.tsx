/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from '@tanstack/react-router'
import { getKPITaskDetail, getKPITaskStats, getKPITaskRanking, type KPIUserStats } from '../api'

export function KPIAdminTaskDetail() {
  const { id } = useParams({ from: '/_authenticated/kpi/admin/tasks/$id' })

  const { data: taskData } = useQuery({
    queryKey: ['kpi', 'admin', 'task', id],
    queryFn: () => getKPITaskDetail(Number(id)),
  })

  const { data: statsData } = useQuery({
    queryKey: ['kpi', 'admin', 'task', id, 'stats'],
    queryFn: () => getKPITaskStats(Number(id)),
  })

  const { data: rankingData } = useQuery({
    queryKey: ['kpi', 'admin', 'task', id, 'ranking'],
    queryFn: () => getKPITaskRanking(Number(id), 1, 50),
  })

  const task = taskData?.data?.task
  const stats = statsData?.data
  const ranking: KPIUserStats[] = rankingData?.data?.list ?? []

  if (!task) return <p className="p-6">加载中...</p>

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <Link to="/kpi/admin/tasks" className="text-sm text-primary hover:underline">
          ← 返回任务列表
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold">{task.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{task.description}</p>

      {/* 统计概览 */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{stats.summary?.total_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">总提交</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.summary?.approved_count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">已通过</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {stats.summary?.rejected_count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">已驳回</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.summary?.pending_count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">待审核</p>
          </div>
        </div>
      )}

      {/* 用户排名 */}
      <h2 className="mb-4 text-lg font-semibold">用户排名</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">排名</th>
              <th className="p-2">用户</th>
              <th className="p-2">提交数</th>
              <th className="p-2">通过数</th>
              <th className="p-2">平均分</th>
              <th className="p-2">完成率</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((user, idx) => (
              <tr key={user.user_id} className="border-b">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">{user.username || `用户${user.user_id}`}</td>
                <td className="p-2">{user.submit_count}</td>
                <td className="p-2">{user.approved_count}</td>
                <td className="p-2">{user.average_score.toFixed(1)}</td>
                <td className="p-2">{user.completion_rate.toFixed(1)}%</td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link
          to="/kpi/admin/submissions"
          search={{ task_id: Number(id) }}
          className="text-sm text-primary hover:underline"
        >
          查看该任务所有提交 →
        </Link>
      </div>
    </div>
  )
}
