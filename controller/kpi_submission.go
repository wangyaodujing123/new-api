package controller

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	kpiUploadDir     = "/data/kpi_uploads"
	kpiMaxFileSize   = 5 * 1024 * 1024 // 5MB
	kpiMaxFilesPerSub = 5
	kpiMaxDailySubs  = 10
)

type ReviewKPISubmissionRequest struct {
	Action  string `json:"action" binding:"required"` // approve / reject
	Score   *int   `json:"score"`
	Comment string `json:"comment"`
}

type UpdateScoreRequest struct {
	Score int `json:"score" binding:"required"`
}

// CreateKPISubmission 用户提交每日记录（multipart/form-data）
func CreateKPISubmission(c *gin.Context) {
	userId := c.GetInt("id")

	// 解析 task_id
	taskIdStr := c.PostForm("task_id")
	if taskIdStr == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "task_id 不能为空"})
		return
	}
	taskId, err := strconv.Atoi(taskIdStr)
	if err != nil || taskId <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的 task_id"})
		return
	}

	// 验证任务存在且为 active
	task, err := model.GetKPITaskById(taskId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if task.Status != model.KPITaskStatusActive {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "该任务已结束，不再接受提交"})
		return
	}

	// 解析 description
	description := c.PostForm("description")
	if len(description) == 0 || len(description) > 2000 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "说明长度必须在 1-2000 个字符之间"})
		return
	}

	// 检查每日提交数量限制
	today := time.Now().Format("2006-01-02")
	count, err := model.CountUserDailySubmissions(taskId, userId, today)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "查询提交数量失败"})
		return
	}
	if count >= kpiMaxDailySubs {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "今日提交次数已达上限（最多 10 次）"})
		return
	}

	// 处理图片上传
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "解析上传文件失败: " + err.Error()})
		return
	}

	files := form.File["screenshots"]
	if len(files) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请至少上传一张截图"})
		return
	}
	if len(files) > kpiMaxFilesPerSub {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("单次提交最多 %d 张图片", kpiMaxFilesPerSub)})
		return
	}

	var uploadedPaths []string
	for _, file := range files {
		// 验证文件大小
		if file.Size > kpiMaxFileSize {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("文件 %s 超过 5MB 大小限制", file.Filename)})
			return
		}
		if file.Size == 0 {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("文件 %s 为空", file.Filename)})
			return
		}

		// 打开文件验证格式
		src, err := file.Open()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "打开文件失败"})
			return
		}

		// 读取前 512 字节检测文件类型
		header := make([]byte, 512)
		n, _ := src.Read(header)
		src.Close()

		contentType := http.DetectContentType(header[:n])
		ext := ""
		switch {
		case strings.HasPrefix(contentType, "image/jpeg"):
			ext = ".jpg"
		case strings.HasPrefix(contentType, "image/png"):
			ext = ".png"
		case strings.HasPrefix(contentType, "image/webp"):
			ext = ".webp"
		default:
			c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("文件 %s 格式不支持，仅支持 JPEG/PNG/WebP", file.Filename)})
			return
		}

		// 生成存储路径
		now := time.Now()
		dateDir := now.Format("2006/01/02")
		dirPath := filepath.Join(kpiUploadDir, dateDir)
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "创建存储目录失败"})
			return
		}

		filename := uuid.New().String() + ext
		fullPath := filepath.Join(dirPath, filename)

		// 保存文件
		if err := c.SaveUploadedFile(file, fullPath); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "保存文件失败"})
			return
		}

		// 记录相对路径（用于 API 访问）
		relativePath := dateDir + "/" + filename
		uploadedPaths = append(uploadedPaths, relativePath)
	}

	// 序列化截图路径为 JSON 数组
	screenshotUrlsBytes, err := common.Marshal(uploadedPaths)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "序列化截图路径失败"})
		return
	}

	// 创建提交记录
	submission := &model.KPISubmission{
		TaskId:         taskId,
		UserId:         userId,
		ScreenshotUrls: string(screenshotUrlsBytes),
		Description:    description,
		SubmissionDate: today,
	}

	if err := model.CreateKPISubmission(submission); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "创建提交记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "提交成功", "data": submission})
}

// GetMyKPISubmissions 用户获取自己的提交列表
func GetMyKPISubmissions(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	taskId, _ := strconv.Atoi(c.DefaultQuery("task_id", "0"))
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))

	submissions, total, err := model.GetUserKPISubmissions(userId, page, pageSize, taskId, status)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取提交列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    submissions,
		"total":   total,
		"page":    page,
	})
}

// GetAllKPISubmissions 管理员获取所有提交列表
func GetAllKPISubmissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	taskId, _ := strconv.Atoi(c.DefaultQuery("task_id", "0"))
	userId, _ := strconv.Atoi(c.DefaultQuery("user_id", "0"))
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	submissions, total, err := model.GetAllKPISubmissions(page, pageSize, taskId, userId, status, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "获取提交列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    submissions,
		"total":   total,
		"page":    page,
	})
}

// ReviewKPISubmission 管理员审核提交
func ReviewKPISubmission(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的提交 ID"})
		return
	}

	var req ReviewKPISubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求参数错误: " + err.Error()})
		return
	}

	reviewerId := c.GetInt("id")
	var status int
	switch req.Action {
	case "approve":
		status = model.KPISubmissionStatusApproved
	case "reject":
		status = model.KPISubmissionStatusRejected
	default:
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "action 必须为 approve 或 reject"})
		return
	}

	if err := model.ReviewKPISubmission(id, status, reviewerId, req.Score, req.Comment); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "审核完成"})
}

// UpdateKPISubmissionScore 修改已审批提交的分数
func UpdateKPISubmissionScore(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无效的提交 ID"})
		return
	}

	var req UpdateScoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求参数错误: " + err.Error()})
		return
	}

	if err := model.UpdateKPISubmissionScore(id, req.Score); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "评分更新成功"})
}

// ServeKPIUpload 提供已上传的截图文件
func ServeKPIUpload(c *gin.Context) {
	filePath := c.Param("filepath")
	// 安全检查：防止路径遍历
	if strings.Contains(filePath, "..") {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "非法路径"})
		return
	}

	fullPath := filepath.Join(kpiUploadDir, filePath)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "文件不存在"})
		return
	}

	// 打开文件检测 content type
	f, err := os.Open(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "读取文件失败"})
		return
	}
	header := make([]byte, 512)
	n, _ := f.Read(header)
	f.Close()
	contentType := http.DetectContentType(header[:n])

	c.Header("Content-Type", contentType)
	c.Header("Cache-Control", "public, max-age=86400")
	c.File(fullPath)
}
