# Requirements Document

## Introduction

KPI 任务管理功能，用于公司内部 API 开发 KPI 考核。管理员可以发布每周/每月的考核任务，用户可以每日提交 AI 使用截图和说明作为完成证明，管理员可以审核提交内容并跟踪完成情况。该功能遵循项目现有的分层架构（Router → Controller → Service → Model），使用 GORM 进行数据库操作，支持 SQLite/MySQL/PostgreSQL 三种数据库。

## Glossary

- **KPI_Task**: 管理员发布的考核任务实体，包含标题、描述、周期类型、截止时间等信息
- **KPI_Submission**: 用户针对某个 KPI 任务提交的每日完成记录，包含截图 URL 和文字说明
- **Admin**: 角色为 admin（role=10）或 root（role=100）的用户，拥有任务发布和审核权限
- **Common_User**: 角色为 common（role=1）的普通用户，可以提交每日记录
- **Task_Period**: 任务的考核周期，分为 weekly（每周）和 monthly（每月）两种
- **Submission_Status**: 提交记录的审核状态，包括 pending（待审核）、approved（已通过）、rejected（已驳回）
- **Task_Status**: 任务的状态，包括 active（进行中）、completed（已结束）、archived（已归档）
- **KPI_System**: 本功能模块的整体系统，包含任务管理和提交管理两个子系统

## Requirements

### Requirement 1: KPI 任务创建与发布

**User Story:** As an Admin, I want to create and publish KPI assessment tasks with specific periods and deadlines, so that users know what they need to accomplish.

#### Acceptance Criteria

1. WHEN an Admin submits a valid task creation request with title, description, period type, start time, and end time, THE KPI_System SHALL create a new KPI_Task record and return the created task details including task ID, title, description, period type, start time, end time, status, and creation time
2. THE KPI_System SHALL require the following fields for task creation: title (varchar, max 128 characters), description (text, max 5000 characters), period type (weekly or monthly), start time (unix timestamp), and end time (unix timestamp)
3. IF the end time is earlier than or equal to the start time, THEN THE KPI_System SHALL reject the request and return a validation error
4. IF the title is empty or exceeds 128 characters, THEN THE KPI_System SHALL reject the request and return a validation error
5. WHEN a task is created, THE KPI_System SHALL set the initial task status to active
6. IF a non-Admin user attempts to create a task, THEN THE KPI_System SHALL reject the request with an insufficient privilege error
7. IF the period type is not one of the allowed values (weekly, monthly), THEN THE KPI_System SHALL reject the request and return a validation error

### Requirement 2: KPI 任务查询与列表

**User Story:** As a user (Admin or Common_User), I want to view the list of KPI tasks, so that I can see current and past assessment tasks.

#### Acceptance Criteria

1. WHEN a Common_User requests the task list, THE KPI_System SHALL return all active KPI_Task records ordered by creation time descending with pagination support (default page size 10, maximum page size 100)
2. WHEN an Admin requests the task list, THE KPI_System SHALL return all KPI_Task records (including completed and archived) ordered by creation time descending with pagination support (default page size 10, maximum page size 100)
3. WHEN a user provides filter parameters, THE KPI_System SHALL support filtering tasks by status (active, completed, archived) and period type (weekly, monthly), applying all provided filters with AND logic
4. WHEN a user requests a specific task by ID, THE KPI_System SHALL return the task details including submission statistics (total submissions count, approved count, rejected count, pending count)
5. IF a user requests a task by ID that does not exist, THEN THE KPI_System SHALL return an error indicating the task was not found

### Requirement 3: KPI 任务管理（编辑、状态变更）

**User Story:** As an Admin, I want to edit task details and change task status, so that I can manage the lifecycle of KPI tasks.

#### Acceptance Criteria

1. WHEN an Admin submits a task update request with one or more editable fields (title, description, start time, end time), THE KPI_System SHALL update only the provided fields on the corresponding KPI_Task record and return the updated task details
2. IF an Admin submits a task update request with a title that is empty or exceeds 128 characters, THEN THE KPI_System SHALL reject the request and return a validation error
3. WHEN an Admin changes a task status to completed, THE KPI_System SHALL set the task status to completed and prevent new submissions
4. WHEN an Admin changes a task status to archived, THE KPI_System SHALL set the task status to archived
5. THE KPI_System SHALL only allow the following status transitions: active to completed, completed to archived, and active to archived
6. IF an Admin attempts a status transition not in the allowed set, THEN THE KPI_System SHALL reject the request and return an error indicating the transition is invalid
7. IF a non-Admin user attempts to edit or change task status, THEN THE KPI_System SHALL reject the request with an insufficient privilege error
8. IF an Admin submits an update or status change for a task ID that does not exist, THEN THE KPI_System SHALL return a not-found error
9. WHEN an Admin deletes a task, THE KPI_System SHALL remove the task and all associated KPI_Submission records

### Requirement 4: 用户每日提交

**User Story:** As a Common_User, I want to submit daily AI usage screenshots and descriptions for a specific KPI task, so that I can record my daily progress.

#### Acceptance Criteria

1. WHEN a Common_User submits a record with a valid task ID, one or more uploaded screenshot images, and a description, THE KPI_System SHALL create a new KPI_Submission record with status set to pending and associate it with the submitting user's ID
2. THE KPI_System SHALL require the following fields for submission: task ID (positive integer), at least one screenshot image (uploaded file), and description (text, min 1 character, max 2000 characters)
3. THE KPI_System SHALL accept the submission as a multipart/form-data request containing the image files and text fields
4. IF the referenced task ID does not correspond to an existing KPI_Task, THEN THE KPI_System SHALL reject the submission and return an error indicating the task does not exist
5. IF the referenced KPI_Task status is not active, THEN THE KPI_System SHALL reject the submission and return an error indicating the task is not accepting submissions
6. WHEN a Common_User submits a record, THE KPI_System SHALL record the submission date (YYYY-MM-DD format) automatically based on server time
7. THE KPI_System SHALL allow a maximum of 10 submissions per user per day for the same task
8. IF a Common_User attempts to exceed 10 submissions for the same task on the same day, THEN THE KPI_System SHALL reject the submission and return an error indicating the daily submission limit has been reached
9. WHEN a submission contains multiple screenshot images, THE KPI_System SHALL store all images and record their paths as a JSON array in the screenshot_urls field
10. THE KPI_System SHALL allow a maximum of 5 images per single submission

### Requirement 5: 用户提交记录查询

**User Story:** As a Common_User, I want to view my submission history for KPI tasks, so that I can track my own progress.

#### Acceptance Criteria

1. WHEN a Common_User requests their submission list, THE KPI_System SHALL return all KPI_Submission records belonging to that user ordered by creation time descending with pagination support, where page size defaults to 10 and has a maximum of 100 per page, and the response SHALL include the total record count
2. WHEN a Common_User requests their submission list with filter parameters, THE KPI_System SHALL support filtering by task ID (integer) and submission status (one of: pending, approved, rejected), and IF an invalid status value is provided, THEN THE KPI_System SHALL ignore the invalid filter and return unfiltered results
3. WHEN a Common_User requests submissions for a specific task, THE KPI_System SHALL return only that user's submissions for the specified task ordered by creation time descending with pagination support
4. IF the specified task ID does not correspond to an existing KPI_Task, THEN THE KPI_System SHALL return an empty result set with total count of 0
5. THE KPI_System SHALL return the following fields for each submission record: submission ID, task ID, task title, screenshot URLs (JSON array of image paths), description, submission status, score (if scored, null otherwise), submission date, review comment (if rejected), and creation time

### Requirement 6: 管理员审核提交

**User Story:** As an Admin, I want to review user submissions and approve or reject them, so that I can assess whether users have met the KPI requirements.

#### Acceptance Criteria

1. WHEN an Admin requests the submission list, THE KPI_System SHALL return all KPI_Submission records across all users ordered by creation time descending with pagination support (default 20 records per page, maximum 100 records per page)
2. THE KPI_System SHALL support filtering submissions by task ID, user ID, submission status (pending, approved, rejected), and date range (start date and end date in YYYY-MM-DD format)
3. WHEN an Admin approves a submission, THE KPI_System SHALL update the submission status to approved, record the reviewer ID, review time (unix timestamp), and optionally a score (integer, 0-100)
4. WHEN an Admin rejects a submission, THE KPI_System SHALL update the submission status to rejected, record the reviewer ID, review time (unix timestamp), and require a rejection reason (text, min 1 character, max 500 characters)
5. WHEN an Admin approves a submission with a score, THE KPI_System SHALL store the score value (integer, range 0 to 100) in the KPI_Submission record
6. IF an Admin provides a score value outside the range 0-100, THEN THE KPI_System SHALL reject the review request and return a validation error
5. IF a submission has already been reviewed (status is not pending), THEN THE KPI_System SHALL reject the review request and return an error indicating the submission has already been processed
6. IF the specified submission ID does not exist, THEN THE KPI_System SHALL return an error indicating the submission was not found
7. IF a non-Admin user attempts to access the submission list or perform a review action, THEN THE KPI_System SHALL reject the request with an insufficient privilege error
8. WHEN an Admin updates the score of an already-approved submission, THE KPI_System SHALL allow modifying the score without changing the submission status

### Requirement 7: KPI 任务完成度统计

**User Story:** As an Admin, I want to see task completion statistics per user, so that I can evaluate KPI performance.

#### Acceptance Criteria

1. WHEN an Admin requests task statistics for a specific task, THE KPI_System SHALL return a summary including: total submissions count, approved count, rejected count, pending count, average score (of scored submissions), and a per-user breakdown containing each user's ID, username, submission count, approved count, rejected count, pending count, average score, and completion rate
2. THE KPI_System SHALL calculate each user's completion rate as: (approved submissions count / total expected submission days) × 100, where total expected submission days equals the number of calendar days from the task start time to the earlier of the task end time or the current date (inclusive), rounded to two decimal places, and capped at a maximum of 100.00%
3. WHEN an Admin requests the user ranking for a specific task, THE KPI_System SHALL return users sorted by average score descending (primary), then by approved submission count descending (secondary), with pagination support, using user ID ascending as the final tie-breaker
4. IF an Admin requests statistics for a task that has no submissions, THEN THE KPI_System SHALL return the summary with all counts set to zero and an empty per-user breakdown list

### Requirement 8: 截图上传与存储

**User Story:** As a Common_User, I want to upload screenshot images directly when submitting my daily report, so that I can attach proof of my AI usage without relying on external image hosting.

#### Acceptance Criteria

1. WHEN an authenticated Common_User uploads an image file as part of a submission, THE KPI_System SHALL validate the file content type by inspecting the file header (magic bytes) and accept the file only if it is in JPEG, PNG, or WebP format and does not exceed 5MB in size
2. WHEN a valid image is uploaded, THE KPI_System SHALL store the file inside the Docker container's persistent volume (/data/kpi_uploads/) and return a relative URL path that can be served by the application
3. IF the uploaded file exceeds 5MB, THEN THE KPI_System SHALL reject the upload and return an error message indicating the file size exceeds the 5MB limit
4. IF the uploaded file content type does not match an accepted format (JPEG, PNG, WebP) based on file header inspection, THEN THE KPI_System SHALL reject the upload and return an error message indicating the file format is not supported
5. THE KPI_System SHALL store uploaded images with unique filenames generated using UUID to prevent conflicts, organized by date subdirectories (e.g., /data/kpi_uploads/2026/05/14/uuid.png)
6. IF the uploaded file is empty (0 bytes), THEN THE KPI_System SHALL reject the upload and return an error message indicating the file is empty
7. IF the file storage operation fails (disk write error or insufficient space), THEN THE KPI_System SHALL reject the upload and return an error message indicating a storage failure without exposing internal system details
8. THE KPI_System SHALL serve uploaded images via a static file route (e.g., GET /api/kpi/uploads/:filename) accessible to authenticated users
9. THE KPI_System SHALL ensure the upload directory is within the Docker volume mount (/data) so that files persist across container restarts

### Requirement 9: 国际化支持

**User Story:** As a user, I want the KPI task management interface to support Chinese language, so that I can use the system in my native language.

#### Acceptance Criteria

1. THE KPI_System SHALL provide all backend error messages and response messages in simplified Chinese
2. THE KPI_System SHALL provide all frontend UI text in simplified Chinese

### Requirement 10: 菜单可见性配置

**User Story:** As an Admin, I want the KPI module to follow the existing sidebar module visibility system, so that I can control whether the KPI menu appears for users through system settings.

#### Acceptance Criteria

1. THE KPI_System SHALL register a `kpi` module key in the `console` sidebar section for user-facing KPI submission pages (view tasks, submit daily reports, view my submissions)
2. THE KPI_System SHALL register a `kpi` module key in the `admin` sidebar section for admin-facing KPI management pages (create/manage tasks, review submissions, view statistics)
3. WHEN an Admin disables the `kpi` module in the sidebar modules configuration (system settings), THE KPI_System SHALL hide the corresponding KPI menu items from the sidebar for all affected users
4. WHEN a user disables the `kpi` module in their personal sidebar settings, THE KPI_System SHALL hide the KPI menu items from that user's sidebar only
5. THE KPI_System SHALL default the `kpi` module to enabled (true) in both console and admin sections when no configuration exists
