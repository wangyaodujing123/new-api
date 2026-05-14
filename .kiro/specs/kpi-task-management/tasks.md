# Implementation Tasks

## Task 1: 创建数据模型
- [ ] 创建 `model/kpi_task.go` — KPITask 结构体定义（含 GORM tags）和数据库操作方法（CRUD、列表查询、状态变更）
- [ ] 创建 `model/kpi_submission.go` — KPISubmission 结构体定义和数据库操作方法（创建、查询、审核、统计）
- [ ] 在 `model/main.go` 的 `migrateDB()` 中注册 `&KPITask{}` 和 `&KPISubmission{}` 进行自动迁移
- [ ] 添加必要的数据库索引（task_id+user_id+submission_date 复合索引）

**Requirements:** 1, 4, 6, 7

## Task 2: 创建控制器 — 任务管理
- [ ] 创建 `controller/kpi_task.go` — 实现以下接口：
  - `CreateKPITask` — 创建任务（验证字段、权限）
  - `GetKPITasks` — 管理员获取所有任务列表（分页、筛选）
  - `GetActiveKPITasks` — 用户获取进行中任务列表
  - `GetKPITask` — 获取任务详情（含提交统计）
  - `UpdateKPITask` — 编辑任务
  - `UpdateKPITaskStatus` — 变更任务状态（含状态流转验证）
  - `DeleteKPITask` — 删除任务及关联提交

**Requirements:** 1, 2, 3

## Task 3: 创建控制器 — 提交与审核
- [ ] 创建 `controller/kpi_submission.go` — 实现以下接口：
  - `CreateKPISubmission` — 用户提交（multipart/form-data，处理图片上传+记录创建）
  - `GetMyKPISubmissions` — 用户查看自己的提交列表
  - `GetAllKPISubmissions` — 管理员查看所有提交列表（筛选：task_id, user_id, status, date range）
  - `ReviewKPISubmission` — 管理员审核（approve/reject + 打分）
  - `UpdateKPISubmissionScore` — 管理员修改已审批提交的分数
  - `GetKPITaskStats` — 获取任务统计（含每用户明细）
  - `GetKPITaskRanking` — 获取用户排名

**Requirements:** 4, 5, 6, 7

## Task 4: 图片上传与静态服务
- [ ] 在 `controller/kpi_submission.go` 中实现图片上传逻辑：
  - 验证文件格式（magic bytes 检测 JPEG/PNG/WebP）
  - 验证文件大小（≤5MB）
  - 生成 UUID 文件名，按日期子目录存储到 `/data/kpi_uploads/YYYY/MM/DD/`
  - 返回相对路径
- [ ] 在路由中注册静态文件服务 `GET /api/kpi/uploads/*filepath`

**Requirements:** 8

## Task 5: 注册路由
- [ ] 在 `router/api-router.go` 中添加 `/api/kpi` 路由组：
  - 用户路由（UserAuth）：GET /task/active, GET /task/:id, POST /submission, GET /submission/self
  - 管理员路由（AdminAuth）：POST /task, GET /task, GET /task/:id, PUT /task/:id, PUT /task/:id/status, DELETE /task/:id, GET /submission, POST /submission/:id/review, PUT /submission/:id/score, GET /task/:id/stats, GET /task/:id/ranking
  - 静态文件路由（UserAuth）：GET /uploads/*filepath

**Requirements:** 1-8

## Task 6: 前端 — 菜单可见性配置
- [ ] 在 `web/default/src/features/system-settings/maintenance/config.ts` 的 `SIDEBAR_MODULES_DEFAULT` 中添加 `kpi: true` 到 console 和 admin 区域
- [ ] 在 `web/default/src/hooks/use-sidebar-config.ts` 的 `DEFAULT_SIDEBAR_MODULES` 和 `URL_TO_CONFIG_MAP` 中添加 KPI 相关配置
- [ ] 在 `web/default/src/hooks/use-sidebar-data.ts` 中添加 KPI 导航项（console 区域 "KPI 考核"，admin 区域 "KPI 管理"）
- [ ] 在 classic 主题 `web/classic/src/hooks/common/useSidebar.js` 的 `DEFAULT_ADMIN_CONFIG` 中添加 kpi 配置

**Requirements:** 10

## Task 7: 前端 — 用户页面
- [ ] 创建 KPI 任务列表页面 `/kpi/tasks` — 展示进行中的任务卡片
- [ ] 创建 KPI 任务详情+提交页面 `/kpi/tasks/:id` — 任务信息 + 图片上传表单 + 提交历史
- [ ] 创建我的提交列表页面 `/kpi/submissions` — 表格展示提交记录（含状态、分数）
- [ ] 实现图片上传组件（支持多图、预览、拖拽）
- [ ] 注册 TanStack Router 路由

**Requirements:** 2, 4, 5

## Task 8: 前端 — 管理员页面
- [ ] 创建管理员任务列表页面 `/kpi/admin/tasks` — 表格+创建/编辑对话框
- [ ] 创建管理员任务详情页面 `/kpi/admin/tasks/:id` — 统计概览 + 用户排名表格
- [ ] 创建管理员审核页面 `/kpi/admin/submissions` — 提交列表+审核操作（批准/驳回/打分）
- [ ] 实现任务创建/编辑表单（react-hook-form + zod 验证）
- [ ] 注册 TanStack Router 路由

**Requirements:** 1, 3, 6, 7

## Task 9: 前端 — API 层与状态管理
- [ ] 创建 `web/default/src/features/kpi/api.ts` — 封装所有 KPI 相关 API 请求（axios）
- [ ] 创建 TanStack Query hooks（useKPITasks, useKPISubmissions, useKPIStats 等）
- [ ] 添加中文翻译 key 到 `web/default/src/i18n/locales/zh.json`

**Requirements:** 9
