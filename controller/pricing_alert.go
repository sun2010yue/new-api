package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func GetPriceAlertLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	logs, total, err := model.GetPriceAlertLogs(page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items":    logs,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func GetUnreadPriceAlertCount(c *gin.Context) {
	count, err := model.GetUnreadPriceAlertCount()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"count": count,
	})
}

func AcknowledgePriceAlert(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	userId, _ := c.Get("id")
	if err := model.AcknowledgePriceAlert(id, userId.(int)); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}

func AcknowledgeAllPriceAlerts(c *gin.Context) {
	userId, _ := c.Get("id")
	if err := model.AcknowledgeAllPriceAlerts(userId.(int)); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}
