package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// KPI 任务状态常量
const (
	KPITaskStatusActive    = 1 // 进行中
	KPITaskStatusCompleted = 2 // 已结束
	KPITaskStatusArchived  = 3 // 已归档
)

// KPI 任务周期类型常量
const (
	KPITaskPeriodWeekly  = "weekly"
	KPITaskPeriodMonthly = "monthly"
)

// KPITask KPI 考核任务模型
type KPITask struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Title       string `json:"title" gorm:"type:varchar(128);not null"`
	Description string `json:"description" gorm:"type:text"`
	PeriodType  string `json:"period_type" gorm:"type:varchar(16);not null"`
	StartTime   int64  `json:"start_time" gorm:"type:bigint;not null"`
	EndTime     int64  `json:"end_time" gorm:"type:bigint;not null"`
	Status      int    `json:"status" gorm:"type:integer;not null;default:1"`
	CreatedBy   int    `json:"created_by" gorm:"type:integer;not null"`
	CreatedAt   int64  `json:"created_at" gorm:"type:bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"type:bigint"`
}

func (KPITask) TableName() string {
	return "kpi_tasks"
}

// CreateKPITask 创建 KPI 任务
func CreateKPITask(task *KPITask) error {
	task.Status = KPITaskStatusActive
	now := time.Now().Unix()
	task.CreatedAt = now
	task.UpdatedAt = now
	return DB.Create(task).Error
}

// GetKPITaskById 根据 ID 获取任务
func GetKPITaskById(id int) (*KPITask, error) {
	var task KPITask
	err := DB.Where("id = ?", id).First(&task).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("任务不存在")
		}
		return nil, err
	}
	return &task, nil
}

// GetAllKPITasks 管理员获取所有任务列表（支持分页和筛选）
func GetAllKPITasks(page, pageSize int, status int, periodType string) ([]KPITask, int64, error) {
	var tasks []KPITask
	var total int64

	query := DB.Model(&KPITask{})

	if status > 0 {
		query = query.Where("status = ?", status)
	}
	if periodType != "" {
		query = query.Where("period_type = ?", periodType)
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
	err = query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tasks).Error
	if err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

// GetActiveKPITasks 用户获取进行中的任务列表
func GetActiveKPITasks(page, pageSize int) ([]KPITask, int64, error) {
	var tasks []KPITask
	var total int64

	query := DB.Model(&KPITask{}).Where("status = ?", KPITaskStatusActive)

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
	err = query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&tasks).Error
	if err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

// UpdateKPITask 更新任务信息（部分字段更新）
func UpdateKPITask(id int, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now().Unix()
	result := DB.Model(&KPITask{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("任务不存在")
	}
	return nil
}

// UpdateKPITaskStatus 变更任务状态（含状态流转验证）
func UpdateKPITaskStatus(id int, newStatus int) error {
	task, err := GetKPITaskById(id)
	if err != nil {
		return err
	}

	if !isValidKPITaskStatusTransition(task.Status, newStatus) {
		return errors.New("无效的状态变更")
	}

	return DB.Model(&KPITask{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     newStatus,
		"updated_at": time.Now().Unix(),
	}).Error
}

// DeleteKPITask 删除 KPI 任务（级联删除关联的提交记录）
func DeleteKPITask(id int) error {
	_, err := GetKPITaskById(id)
	if err != nil {
		return err
	}

	return DB.Transaction(func(tx *gorm.DB) error {
		// 级联删除关联的提交记录
		if err := tx.Where("task_id = ?", id).Delete(&KPISubmission{}).Error; err != nil {
			return err
		}
		// 删除任务本身
		if err := tx.Where("id = ?", id).Delete(&KPITask{}).Error; err != nil {
			return err
		}
		return nil
	})
}

// isValidKPITaskStatusTransition 验证状态流转是否合法
// 允许: active→completed, completed→archived, active→archived
func isValidKPITaskStatusTransition(current, next int) bool {
	switch current {
	case KPITaskStatusActive:
		return next == KPITaskStatusCompleted || next == KPITaskStatusArchived
	case KPITaskStatusCompleted:
		return next == KPITaskStatusArchived
	default:
		return false
	}
}

// IsValidKPITaskPeriodType 检查周期类型是否合法
func IsValidKPITaskPeriodType(periodType string) bool {
	return periodType == KPITaskPeriodWeekly || periodType == KPITaskPeriodMonthly
}

// IsValidKPITaskStatus 检查任务状态值是否合法
func IsValidKPITaskStatus(status int) bool {
	return status == KPITaskStatusActive || status == KPITaskStatusCompleted || status == KPITaskStatusArchived
}
