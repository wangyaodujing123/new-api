/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  getAllKPITasks,
  createKPITask,
  deleteKPITask,
  updateKPITaskStatus,
  KPI_TASK_STATUS_LABELS,
  KPI_PERIOD_LABELS,
  type KPITask,
} from '../api'

export function KPIAdminTasks() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    period_type: 'weekly',
    start_time: '',
    end_time: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'admin', 'tasks'],
    queryFn: () => getAllKPITasks({ page_size: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createKPITask({
        title: form.title,
        description: form.description,
        period_type: form.period_type,
        start_time: Math.floor(new Date(form.start_time).getTime() / 1000),
        end_time: Math.floor(new Date(form.end_time).getTime() / 1000),
      }),
    onSuccess: () => {
      toast.success('任务创建成功')
      setShowCreate(false)
      setForm({ title: '', description: '', period_type: 'weekly', start_time: '', end_time: '' })
      queryClient.invalidateQueries({ queryKey: ['kpi'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '创建失败'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteKPITask(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['kpi'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      updateKPITaskStatus(id, status),
    onSuccess: () => {
      toast.success('状态变更成功')
      queryClient.invalidateQueries({ queryKey: ['kpi'] })
    },
  })

  const tasks: KPITask[] = data?.data?.list ?? []

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">KPI 任务管理</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {showCreate ? '取消' : '创建任务'}
        </button>
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="mb-6 rounded-lg border p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">标题</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={128}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">周期类型</label>
              <select
                value={form.period_type}
                onChange={(e) => setForm({ ...form, period_type: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">开始时间</label>
              <input
                type="date"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">结束时间</label>
              <input
                type="date"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? '创建中...' : '确认创建'}
          </button>
        </form>
      )}

      {/* 任务列表 */}
      {isLoading && <p className="text-muted-foreground">加载中...</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">标题</th>
              <th className="p-2">周期</th>
              <th className="p-2">时间范围</th>
              <th className="p-2">状态</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b">
                <td className="p-2">
                  <Link
                    to="/kpi/admin/tasks/$id"
                    params={{ id: String(task.id) }}
                    className="text-primary hover:underline"
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="p-2">{KPI_PERIOD_LABELS[task.period_type]}</td>
                <td className="p-2 text-xs">
                  {new Date(task.start_time * 1000).toLocaleDateString()} ~{' '}
                  {new Date(task.end_time * 1000).toLocaleDateString()}
                </td>
                <td className="p-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      task.status === 1
                        ? 'bg-green-100 text-green-700'
                        : task.status === 2
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {KPI_TASK_STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="flex gap-1 p-2">
                  {task.status === 1 && (
                    <button
                      onClick={() => statusMutation.mutate({ id: task.id, status: 2 })}
                      className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-200"
                    >
                      结束
                    </button>
                  )}
                  {task.status === 2 && (
                    <button
                      onClick={() => statusMutation.mutate({ id: task.id, status: 3 })}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      归档
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('确定删除该任务及所有提交记录？')) {
                        deleteMutation.mutate(task.id)
                      }
                    }}
                    className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
