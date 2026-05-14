package model

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// KPI 提交审核状态常量
const (
	KPISubmissionStatusPending  = 0 // 待审核
	KPISubmissionStatusApproved = 1 // 已通过
	KPISubmissionStatusRejected = 2 // 已驳回
)

// KPISubmission KPI 提交记录模型
type KPISubmission struct {
	Id             int    `json:"id" gorm:"primaryKey;autoIncrement"`
	TaskId         int    `json:"task_id" gorm:"type:integer;not null;index:idx_kpi_submissions_task_user_date;index:idx_kpi_submissions_task_status"`
	UserId         int    `json:"user_id" gorm:"type:integer;not null;index:idx_kpi_submissions_task_user_date"`
	ScreenshotUrls string `json:"screenshot_urls" gorm:"type:text;not null"`
	Description    string `json:"description" gorm:"type:text;not null"`
	SubmissionDate string `json:"submission_date" gorm:"type:varchar(10);not null;index:idx_kpi_submissions_task_user_date"`
	Status         int    `json:"status" gorm:"type:integer;not null;default:0;index:idx_kpi_submissions_task_status"`
	Score          *int   `json:"score" gorm:"type:integer"`
	ReviewerId     *int   `json:"reviewer_id" gorm:"type:integer"`
	ReviewTime     *int64 `json:"review_time" gorm:"type:bigint"`
	ReviewComment  string `json:"review_comment" gorm:"type:varchar(500)"`
	CreatedAt      int64  `json:"created_at" gorm:"type:bigint"`
	UpdatedAt      int64  `json:"updated_at" gorm:"type:bigint"`
}

func (KPISubmission) TableName() string {
	return "kpi_submissions"
}

// CreateKPISubmission 创建提交记录
func CreateKPISubmission(submission *KPISubmission) error {
	submission.Status = KPISubmissionStatusPending
	now := time.Now().Unix()
	submission.CreatedAt = now
	submission.UpdatedAt = now
	if submission.SubmissionDate == "" {
		submission.SubmissionDate = time.Now().Format("2006-01-02")
	}
	return DB.Create(submission).Error
}

// GetKPISubmissionById 根据 ID 获取提交记录
func GetKPISubmissionById(id int) (*KPISubmission, error) {
	var submission KPISubmission
	err := DB.Where("id = ?", id).First(&submission).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("提交记录不存在")
		}
		return nil, err
	}
	return &submission, nil
}

// CountUserDailySubmissions 统计用户当天对某任务的提交数量
func CountUserDailySubmissions(taskId, userId int, date string) (int64, error) {
	var count int64
	err := DB.Model(&KPISubmission{}).
		Where("task_id = ? AND user_id = ? AND submission_date = ?", taskId, userId, date).
		Count(&count).Error
	return count, err
}

// GetUserKPISubmissions 用户获取自己的提交列表（支持分页和筛选）
func GetUserKPISubmissions(userId int, page, pageSize int, taskId int, status int) ([]KPISubmission, int64, error) {
	var submissions []KPISubmission
	var total int64

	query := DB.Model(&KPISubmission{}).Where("user_id = ?", userId)

	if taskId > 0 {
		query = query.Where("task_id = ?", taskId)
	}
	if status >= 0 {
		query = query.Where("status = ?", status)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize
	err = query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&submissions).Error
	if err != nil {
		return nil, 0, err
	}

	return submissions, total, nil
}

// GetAllKPISubmissions 管理员获取所有提交列表（支持分页和筛选）
func GetAllKPISubmissions(page, pageSize int, taskId, userId, status int, startDate, endDate string) ([]KPISubmission, int64, error) {
	var submissions []KPISubmission
	var total int64

	query := DB.Model(&KPISubmission{})

	if taskId > 0 {
		query = query.Where("task_id = ?", taskId)
	}
	if userId > 0 {
		query = query.Where("user_id = ?", userId)
	}
	if status >= 0 {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("submission_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("submission_date <= ?", endDate)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize
	err = query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&submissions).Error
	if err != nil {
		return nil, 0, err
	}

	return submissions, total, nil
}

// ReviewKPISubmission 审核提交记录（批准/驳回 + 打分）
func ReviewKPISubmission(id int, status int, reviewerId int, score *int, comment string) error {
	submission, err := GetKPISubmissionById(id)
	if err != nil {
		return err
	}

	if submission.Status != KPISubmissionStatusPending {
		return errors.New("该提交已被审核，不能重复操作")
	}

	if status != KPISubmissionStatusApproved && status != KPISubmissionStatusRejected {
		return errors.New("无效的审核状态")
	}

	now := time.Now().Unix()
	updates := map[string]interface{}{
		"status":      status,
		"reviewer_id": reviewerId,
		"review_time": now,
		"updated_at":  now,
	}

	if status == KPISubmissionStatusRejected {
		if comment == "" {
			return errors.New("驳回时必须填写原因")
		}
		updates["review_comment"] = comment
	}

	if score != nil {
		if *score < 0 || *score > 100 {
			return errors.New("评分必须在 0-100 之间")
		}
		updates["score"] = *score
	}

	return DB.Model(&KPISubmission{}).Where("id = ?", id).Updates(updates).Error
}

// UpdateKPISubmissionScore 修改已审批提交的分数
func UpdateKPISubmissionScore(id int, score int) error {
	if score < 0 || score > 100 {
		return errors.New("评分必须在 0-100 之间")
	}

	submission, err := GetKPISubmissionById(id)
	if err != nil {
		return err
	}

	if submission.Status != KPISubmissionStatusApproved {
		return errors.New("只能修改已通过的提交的分数")
	}

	return DB.Model(&KPISubmission{}).Where("id = ?", id).Updates(map[string]interface{}{
		"score":      score,
		"updated_at": time.Now().Unix(),
	}).Error
}

// KPITaskStats 任务统计结构
type KPITaskStats struct {
	TotalCount    int64              `json:"total_count"`
	ApprovedCount int64              `json:"approved_count"`
	RejectedCount int64              `json:"rejected_count"`
	PendingCount  int64              `json:"pending_count"`
	AverageScore  float64            `json:"average_score"`
	UserStats     []KPIUserStatEntry `json:"user_stats"`
}

// KPIUserStatEntry 每用户统计条目
type KPIUserStatEntry struct {
	UserId         int     `json:"user_id"`
	Username       string  `json:"username"`
	SubmitCount    int64   `json:"submit_count"`
	ApprovedCount  int64   `json:"approved_count"`
	RejectedCount  int64   `json:"rejected_count"`
	PendingCount   int64   `json:"pending_count"`
	AverageScore   float64 `json:"average_score"`
	CompletionRate float64 `json:"completion_rate"`
}

// GetKPITaskStats 获取任务统计
func GetKPITaskStats(taskId int) (*KPITaskStats, error) {
	task, err := GetKPITaskById(taskId)
	if err != nil {
		return nil, err
	}

	stats := &KPITaskStats{}

	// 总体统计
	DB.Model(&KPISubmission{}).Where("task_id = ?", taskId).Count(&stats.TotalCount)
	DB.Model(&KPISubmission{}).Where("task_id = ? AND status = ?", taskId, KPISubmissionStatusApproved).Count(&stats.ApprovedCount)
	DB.Model(&KPISubmission{}).Where("task_id = ? AND status = ?", taskId, KPISubmissionStatusRejected).Count(&stats.RejectedCount)
	DB.Model(&KPISubmission{}).Where("task_id = ? AND status = ?", taskId, KPISubmissionStatusPending).Count(&stats.PendingCount)

	// 平均分
	var avgScore *float64
	DB.Model(&KPISubmission{}).
		Where("task_id = ? AND score IS NOT NULL", taskId).
		Select("AVG(score)").
		Scan(&avgScore)
	if avgScore != nil {
		stats.AverageScore = *avgScore
	}

	// 每用户统计
	type userSubmitRow struct {
		UserId        int
		SubmitCount   int64
		ApprovedCount int64
		RejectedCount int64
		PendingCount  int64
		AvgScore      *float64
	}

	var rows []userSubmitRow
	DB.Model(&KPISubmission{}).
		Select("user_id, COUNT(*) as submit_count, "+
			"SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved_count, "+
			"SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected_count, "+
			"SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_count, "+
			"AVG(CASE WHEN score IS NOT NULL THEN score ELSE NULL END) as avg_score",
			KPISubmissionStatusApproved, KPISubmissionStatusRejected, KPISubmissionStatusPending).
		Where("task_id = ?", taskId).
		Group("user_id").
		Find(&rows)

	// 计算预期天数
	expectedDays := calculateExpectedDays(task)

	for _, row := range rows {
		entry := KPIUserStatEntry{
			UserId:        row.UserId,
			SubmitCount:   row.SubmitCount,
			ApprovedCount: row.ApprovedCount,
			RejectedCount: row.RejectedCount,
			PendingCount:  row.PendingCount,
		}
		if row.AvgScore != nil {
			entry.AverageScore = *row.AvgScore
		}
		if expectedDays > 0 {
			rate := float64(row.ApprovedCount) / float64(expectedDays) * 100
			if rate > 100 {
				rate = 100
			}
			entry.CompletionRate = rate
		}

		// 获取用户名
		user, uErr := GetUserById(row.UserId, false)
		if uErr == nil && user != nil {
			entry.Username = user.Username
		} else {
			entry.Username = fmt.Sprintf("用户%d", row.UserId)
		}

		stats.UserStats = append(stats.UserStats, entry)
	}

	if stats.UserStats == nil {
		stats.UserStats = []KPIUserStatEntry{}
	}

	return stats, nil
}

// KPIRankingEntry 排名条目
type KPIRankingEntry struct {
	UserId        int     `json:"user_id"`
	Username      string  `json:"username"`
	ApprovedCount int64   `json:"approved_count"`
	AverageScore  float64 `json:"average_score"`
}

// GetKPITaskRanking 获取任务用户排名
func GetKPITaskRanking(taskId int, page, pageSize int) ([]KPIRankingEntry, int64, error) {
	_, err := GetKPITaskById(taskId)
	if err != nil {
		return nil, 0, err
	}

	type rankRow struct {
		UserId        int
		ApprovedCount int64
		AvgScore      *float64
	}

	var total int64
	DB.Model(&KPISubmission{}).
		Where("task_id = ?", taskId).
		Select("DISTINCT user_id").
		Count(&total)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var rows []rankRow
	offset := (page - 1) * pageSize
	DB.Model(&KPISubmission{}).
		Select("user_id, "+
			"SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved_count, "+
			"AVG(CASE WHEN score IS NOT NULL THEN score ELSE NULL END) as avg_score",
			KPISubmissionStatusApproved).
		Where("task_id = ?", taskId).
		Group("user_id").
		Order("avg_score DESC, approved_count DESC, user_id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&rows)

	var entries []KPIRankingEntry
	for _, row := range rows {
		entry := KPIRankingEntry{
			UserId:        row.UserId,
			ApprovedCount: row.ApprovedCount,
		}
		if row.AvgScore != nil {
			entry.AverageScore = *row.AvgScore
		}
		user, uErr := GetUserById(row.UserId, false)
		if uErr == nil && user != nil {
			entry.Username = user.Username
		} else {
			entry.Username = fmt.Sprintf("用户%d", row.UserId)
		}
		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []KPIRankingEntry{}
	}

	return entries, total, nil
}

// GetKPISubmissionCountByTaskAndStatus 获取任务的各状态提交数量
func GetKPISubmissionCountByTaskAndStatus(taskId int) (total, approved, rejected, pending int64) {
	DB.Model(&KPISubmission{}).Where("task_id = ?", taskId).Count(&total)
	DB.Model(&KPISubmission{}).Where("task_id = ? AND status = ?", taskId, KPISubmissionStatusApproved).Count(&approved)
	DB.Model(&KPISubmission{}).Where("task_id = ? AND status = ?", taskId, KPISubmissionStatusRejected).Count(&rejected)
	DB.Model(&KPISubmission{}).Where("task_id = ? AND status = ?", taskId, KPISubmissionStatusPending).Count(&pending)
	return
}

// calculateExpectedDays 计算任务预期提交天数
func calculateExpectedDays(task *KPITask) int {
	startTime := time.Unix(task.StartTime, 0)
	endTime := time.Unix(task.EndTime, 0)
	now := time.Now()

	if now.Before(endTime) {
		endTime = now
	}

	days := int(endTime.Sub(startTime).Hours()/24) + 1
	if days < 0 {
		days = 0
	}
	return days
}
