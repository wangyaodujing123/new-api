/*
Copyright (C) 2023-2026 QuantumNous
*/
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getActiveKPITasks, KPI_PERIOD_LABELS, type KPITask } from '../api'

export function KPITaskList() {
  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'tasks', 'active'],
    queryFn: () => getActiveKPITasks(1, 50),
  })

  const tasks: KPITask[] = data?.data?.list ?? []

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">KPI 考核任务</h1>

      {isLoading && <p className="text-muted-foreground">加载中...</p>}

      {!isLoading && tasks.length === 0 && (
        <p className="text-muted-foreground">暂无进行中的考核任务</p>
      )}

      <div className="grid gap-4">
        {tasks.map((task) => (
          <Link
            key={task.id}
            to="/kpi/tasks/$id"
            params={{ id: String(task.id) }}
            className="block rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{task.title}</h3>
              <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                {KPI_PERIOD_LABELS[task.period_type] ?? task.period_type}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {task.description}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>
                开始: {new Date(task.start_time * 1000).toLocaleDateString()}
              </span>
              <span>
                截止: {new Date(task.end_time * 1000).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
