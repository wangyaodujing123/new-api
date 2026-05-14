package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type CreateKPITaskRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	PeriodType  string `json:"period_type" binding:"required"`
	StartTime   int64  `json:"start_time" binding:"required"`
	EndTime     int64  `json:"end_time" binding:"required"`
}

type UpdateKPITaskRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	StartTime   *int64  `json:"start_time"`
	EndTime     *int64  `json:"end_time"`
}

type UpdateKPITaskStatusRequest struct {
	Status int `json:"status" binding:"required"`
}

// CreateKPITask 创建 KPI 任务
func CreateKPITask(c *gin.Context) {
	var req CreateKPITaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求参数错误: " + err.Error()})
		return
	}

	// 验证标题长度
	if len(req.Title) == 0 || len(req.Title) > 128 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "标题长度必须在 1-128 个字符之间"})
		return
	}

	// 验证周期类型
	if !model.IsValidKPITaskPeriodType(req.PeriodType) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "周期类型必须为 weekly 或 monthly"})
		return
	}

	// 验证时间
	if req.EndTime <= req.StartTime {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "结束时间必须晚于开始时间"})
		return
	}

	userId := c.GetInt("id")
	task := &model.KPITask{
		Title:       req.Title,
		Description: req.Description,
		PeriodType:  req.PeriodType,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		CreatedBy:   userId,
	}

	if err := model.CreateKPITask(task); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "创建任务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "创建成功", "data": task})
}

// GetKPITasks 管理员获取所有任务列表
func GetKPITasks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	periodType := c.Query("period_type")

	tasks, total, err := model.GetAllKPITasks(page, pageSize, status, periodType)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取任务列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  tasks,
			"total": total,
			"page":  page,
		},
	})
}

// GetActiveKPITasks 用户获取进行中的任务列表
func GetActiveKPITasks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	tasks, total, err := model.GetActiveKPITasks(page, pageSize)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取任务列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  tasks,
			"total": total,
			"page":  page,
		},
	})
}

// GetKPITask 获取任务详情（含提交统计）
func GetKPITask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的任务 ID"})
		return
	}

	task, err := model.GetKPITaskById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	total, approved, rejected, pending := model.GetKPISubmissionCountByTaskAndStatus(id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task":           task,
			"total_count":    total,
			"approved_count": approved,
			"rejected_count": rejected,
			"pending_count":  pending,
		},
	})
}

// UpdateKPITask 编辑任务
func UpdateKPITask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的任务 ID"})
		return
	}

	var req UpdateKPITaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求参数错误: " + err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		if len(*req.Title) == 0 || len(*req.Title) > 128 {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "标题长度必须在 1-128 个字符之间"})
			return
		}
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.StartTime != nil {
		updates["start_time"] = *req.StartTime
	}
	if req.EndTime != nil {
		updates["end_time"] = *req.EndTime
	}

	if len(updates) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "没有需要更新的字段"})
		return
	}

	if err := model.UpdateKPITask(id, updates); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "更新成功"})
}

// UpdateKPITaskStatus 变更任务状态
func UpdateKPITaskStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的任务 ID"})
		return
	}

	var req UpdateKPITaskStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求参数错误: " + err.Error()})
		return
	}

	if !model.IsValidKPITaskStatus(req.Status) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的状态值"})
		return
	}

	if err := model.UpdateKPITaskStatus(id, req.Status); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "状态更新成功"})
}

// DeleteKPITask 删除任务
func DeleteKPITask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的任务 ID"})
		return
	}

	if err := model.DeleteKPITask(id); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "删除成功"})
}

// GetKPITaskStats 获取任务统计
func GetKPITaskStats(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的任务 ID"})
		return
	}

	stats, err := model.GetKPITaskStats(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": stats})
}

// GetKPITaskRanking 获取用户排名
func GetKPITaskRanking(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的任务 ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	entries, total, err := model.GetKPITaskRanking(id, page, pageSize)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":  entries,
			"total": total,
			"page":  page,
		},
	})
}
