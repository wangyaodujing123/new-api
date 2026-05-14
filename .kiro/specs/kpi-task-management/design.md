# Technical Design — KPI 任务管理

## Overview

本功能为 new-api 项目新增 KPI 考核任务管理模块。管理员可发布周/月考核任务，用户可每日提交 AI 使用截图和说明，管理员可审核并打分。

遵循项目现有分层架构：Router → Controller → Service → Model，使用 GORM 进行数据库操作。

---

## 1. 数据模型

### 1.1 KPITask 表 (`kpi_tasks`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer (PK, auto) | 主键 |
| title | varchar(128) NOT NULL | 任务标题 |
| description | text | 任务描述 |
| period_type | varchar(16) NOT NULL | 周期类型: weekly / monthly |
| start_time | bigint NOT NULL | 开始时间 (unix timestamp) |
| end_time | bigint NOT NULL | 结束时间 (unix timestamp) |
| status | integer NOT NULL DEFAULT 1 | 状态: 1=active, 2=completed, 3=archived |
| created_by | integer NOT NULL | 创建者用户 ID |
| created_at | bigint | 创建时间 |
| updated_at | bigint | 更新时间 |

### 1.2 KPISubmission 表 (`kpi_submissions`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer (PK, auto) | 主键 |
| task_id | integer NOT NULL | 关联任务 ID (外键 kpi_tasks.id) |
| user_id | integer NOT NULL | 提交者用户 ID |
| screenshot_urls | text NOT NULL | 截图路径 JSON 数组 |
| description | text NOT NULL | 提交说明 |
| submission_date | varchar(10) NOT NULL | 提交日期 YYYY-MM-DD |
| status | integer NOT NULL DEFAULT 0 | 审核状态: 0=pending, 1=approved, 2=rejected |
| score | integer | 评分 0-100, NULL 表示未评分 |
| reviewer_id | integer | 审核人用户 ID |
| review_time | bigint | 审核时间 (unix timestamp) |
| review_comment | varchar(500) | 驳回原因 |
| created_at | bigint | 创建时间 |
| updated_at | bigint | 更新时间 |

**索引：**
- `idx_kpi_submissions_task_user_date` ON (task_id, user_id, submission_date) — 用于每日提交数量限制查询
- `idx_kpi_submissions_task_status` ON (task_id, status) — 用于统计查询

---

## 2. API 设计

### 2.1 管理员接口 (需要 AdminAuth)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/kpi/task | 创建任务 |
| GET | /api/kpi/task | 获取任务列表（含所有状态） |
| GET | /api/kpi/task/:id | 获取任务详情（含统计） |
| PUT | /api/kpi/task/:id | 编辑任务 |
| PUT | /api/kpi/task/:id/status | 变更任务状态 |
| DELETE | /api/kpi/task/:id | 删除任务 |
| GET | /api/kpi/submission | 获取所有提交列表 |
| POST | /api/kpi/submission/:id/review | 审核提交（批准/驳回+打分） |
| PUT | /api/kpi/submission/:id/score | 修改已审批提交的分数 |
| GET | /api/kpi/task/:id/stats | 获取任务统计 |
| GET | /api/kpi/task/:id/ranking | 获取用户排名 |

### 2.2 用户接口 (需要 UserAuth)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/kpi/task/active | 获取进行中的任务列表 |
| GET | /api/kpi/task/:id | 获取任务详情 |
| POST | /api/kpi/submission | 提交每日记录（multipart/form-data） |
| GET | /api/kpi/submission/self | 获取我的提交列表 |

### 2.3 图片服务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/kpi/uploads/* | 静态文件服务，提供已上传的截图 |

---

## 3. 文件上传方案

- 存储路径：`/data/kpi_uploads/YYYY/MM/DD/{uuid}.{ext}`
- Docker volume 挂载：`./data:/data`（已有配置）
- 文件名：UUID v4 生成，避免冲突
- 格式验证：通过 magic bytes 检测 JPEG/PNG/WebP
- 大小限制：单文件 5MB，单次提交最多 5 张
- 提交时图片随表单一起上传（multipart/form-data），后端先存储图片再创建 submission 记录

---

## 4. 菜单可见性集成

### 4.1 Sidebar Modules 配置

在 `SIDEBAR_MODULES_DEFAULT` 中新增：

```json
{
  "console": {
    "enabled": true,
    "kpi": true,
    ...
  },
  "admin": {
    "enabled": true,
    "kpi": true,
    ...
  }
}
```

### 4.2 URL 映射

在 `URL_TO_CONFIG_MAP` 中新增：

```typescript
'/kpi': { section: 'console', module: 'kpi' },
'/kpi/tasks': { section: 'console', module: 'kpi' },
'/kpi/submissions': { section: 'console', module: 'kpi' },
'/kpi/admin': { section: 'admin', module: 'kpi' },
'/kpi/admin/tasks': { section: 'admin', module: 'kpi' },
'/kpi/admin/submissions': { section: 'admin', module: 'kpi' },
```

### 4.3 导航项

- **console 区域**：添加 "KPI 考核" 菜单项，链接到 `/kpi/tasks`
- **admin 区域**：添加 "KPI 管理" 菜单项，链接到 `/kpi/admin/tasks`

---

## 5. 前端页面结构

```
/kpi/tasks          — 用户查看进行中的任务列表
/kpi/tasks/:id      — 用户查看任务详情 + 提交表单
/kpi/submissions    — 用户查看自己的提交历史

/kpi/admin/tasks         — 管理员任务列表（含创建按钮）
/kpi/admin/tasks/:id     — 管理员任务详情 + 统计 + 排名
/kpi/admin/submissions   — 管理员审核提交列表
```

---

## 6. 后端代码结构

```
controller/
  kpi_task.go          — 任务 CRUD 控制器
  kpi_submission.go    — 提交和审核控制器

model/
  kpi_task.go          — KPITask 模型定义和数据库操作
  kpi_submission.go    — KPISubmission 模型定义和数据库操作

router/
  api-router.go        — 注册 /api/kpi/* 路由组
```

---

## 7. 状态流转

```
KPI Task:    active → completed → archived
                 ↘                ↗
                   → archived

KPI Submission:  pending → approved (可打分)
                        → rejected (需填原因)
```

---

## 8. 数据库兼容性

- 使用 GORM AutoMigrate，不使用数据库特定语法
- JSON 数组字段 (screenshot_urls) 使用 TEXT 类型存储，应用层序列化/反序列化
- 时间字段使用 bigint (unix timestamp)
- 布尔/状态字段使用 integer
