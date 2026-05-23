package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type ChannelModelPriceRequest struct {
	ChannelId     int     `json:"channel_id" binding:"required"`
	ModelName     string  `json:"model_name" binding:"required"`
	UpstreamPrice float64 `json:"upstream_price"`
	CostPrice     float64 `json:"cost_price"`
	PlatformRatio float64 `json:"platform_ratio"`
	PlatformPrice float64 `json:"platform_price"`
	Status        int     `json:"status"`
}

type BatchPricingRequest struct {
	ChannelId     int     `json:"channel_id" binding:"required"`
	ModelFilter   string  `json:"model_filter"`
	PlatformRatio float64 `json:"platform_ratio" binding:"required"`
	PricingMode   int     `json:"pricing_mode"` // 1=折扣率模式 2=利润率模式
	DryRun        bool    `json:"dry_run"`
}

type SyncPriceRequest struct {
	ChannelId int  `json:"channel_id" binding:"required"`
	DryRun    bool `json:"dry_run"`
}

func GetChannelModelPrices(c *gin.Context) {
	channelId, _ := strconv.Atoi(c.DefaultQuery("channel_id", "0"))
	modelFilter := c.DefaultQuery("model_filter", "all")

	prices, err := model.GetChannelModelPrices(channelId, modelFilter)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items": prices,
		"total": len(prices),
	})
}

func GetChannelModelPrice(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	price, err := model.GetChannelModelPriceById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "模型价格记录不存在",
		})
		return
	}

	common.ApiSuccess(c, price)
}

func CreateChannelModelPrice(c *gin.Context) {
	var req ChannelModelPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if valid, msg := model.ValidatePriceAntiInversion(req.PlatformPrice, req.CostPrice); !valid {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": msg,
		})
		return
	}

	price := &model.ChannelModelPrice{
		ChannelId:     req.ChannelId,
		ModelName:     req.ModelName,
		UpstreamPrice: req.UpstreamPrice,
		CostPrice:     req.CostPrice,
		PlatformRatio: req.PlatformRatio,
		PlatformPrice: req.PlatformPrice,
		Status:        req.Status,
	}

	if err := price.Save(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, price)
}

func UpdateChannelModelPrice(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	var req struct {
		PlatformRatio *float64 `json:"platform_ratio"`
		PlatformPrice *float64 `json:"platform_price"`
		Status       *int      `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	price, err := model.GetChannelModelPriceById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "模型价格记录不存在",
		})
		return
	}

	if req.PlatformRatio != nil {
		price.PlatformRatio = *req.PlatformRatio
	}

	if req.PlatformPrice != nil {
		price.PlatformPrice = *req.PlatformPrice
		if valid, msg := model.ValidatePriceAntiInversion(price.PlatformPrice, price.CostPrice); !valid {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
			return
		}
	}

	if req.Status != nil {
		price.Status = *req.Status
	}

	if err := model.UpdateChannelModelPrice(price); err != nil {
		common.ApiError(c, err)
		return
	}

	// Write back model_ratio to billing system
	if req.PlatformPrice != nil || req.PlatformRatio != nil {
		model.SyncModelRatioToPricing(price.ModelName, price.PlatformPrice)
	}

	userId, _ := c.Get("id")
	model.RecordLog(userId.(int), model.LogTypeSystem, "更新模型价格: "+price.ModelName)

	common.ApiSuccess(c, price)
}

func DeleteChannelModelPrice(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	_, err = model.GetChannelModelPriceById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "模型价格记录不存在",
		})
		return
	}

	if err := model.DeleteChannelModelPrice(id); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}

func SyncChannelPrices(c *gin.Context) {
	var req SyncPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	result, err := model.SyncChannelPrices(req.ChannelId, req.DryRun)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	userId, _ := c.Get("id")
	log := &model.PriceSyncLog{
		ChannelId:   &req.ChannelId,
		Action:      "sync",
		ModelsCount: result.AffectedCount,
		OperatorId:  func() *int { id := userId.(int); return &id }(),
		Result:      "success",
	}
	if len(result.Warnings) > 0 {
		log.Result = "partial"
	}

	// Populate before/after data for changed models
	before := map[string]float64{}
	after := map[string]float64{}
	for _, c := range result.PriceChanges {
		if c.Status == "created" || c.Status == "updated" {
			before[c.ModelName] = c.OldPlatformPrice
			after[c.ModelName] = c.NewPlatformPrice
		}
	}
	if len(before) > 0 {
		if b, err := common.Marshal(before); err == nil {
			log.BeforeData = string(b)
		}
		if a, err := common.Marshal(after); err == nil {
			log.AfterData = string(a)
		}
	}

	model.CreatePriceSyncLog(log)

	common.ApiSuccess(c, result)
}

func BatchUpdateChannelPricing(c *gin.Context) {
	var req BatchPricingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if req.PricingMode == 2 {
		if req.PlatformRatio <= 0 || req.PlatformRatio > 500 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "利润率必须在 0.1% - 500% 之间",
			})
			return
		}
	} else {
		if req.PlatformRatio <= 0 || req.PlatformRatio > 3 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "平台折扣必须在 0.01 - 3.0 之间",
			})
			return
		}
		req.PricingMode = 1
	}

	result, err := model.BatchUpdateChannelPricing(req.ChannelId, req.PlatformRatio, req.ModelFilter, req.DryRun, req.PricingMode)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if result.Blocked {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "批量操作被阻止，存在价格倒挂风险",
			"data":    result,
		})
		return
	}

	userId, _ := c.Get("id")
	log := &model.PriceSyncLog{
		ChannelId:   &req.ChannelId,
		Action:      "batch_update",
		ModelsCount: result.AffectedModels,
		OperatorId:  func() *int { id := userId.(int); return &id }(),
		Result:      "success",
	}

	// Populate before/after data for changed models
	before := map[string]float64{}
	after := map[string]float64{}
	for _, c := range result.PriceChanges {
		if c.Status == "updated" {
			before[c.ModelName] = c.OldPlatformPrice
			after[c.ModelName] = c.NewPlatformPrice
		}
	}
	if len(before) > 0 {
		if b, err := common.Marshal(before); err == nil {
			log.BeforeData = string(b)
		}
		if a, err := common.Marshal(after); err == nil {
			log.AfterData = string(a)
		}
	}

	model.CreatePriceSyncLog(log)

	common.ApiSuccess(c, result)
}

func CheckPriceAnomalies(c *gin.Context) {
	anomalies, err := model.CheckPriceAnomalies()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items": anomalies,
		"total": len(anomalies),
	})
}

func GetPricingStats(c *gin.Context) {
	stats, err := model.GetPricingStats()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, stats)
}

func GetPriceSyncLogs(c *gin.Context) {
	channelId, _ := strconv.Atoi(c.DefaultQuery("channel_id", "0"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	logs, total, err := model.GetPriceSyncLogs(channelId, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items":     logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
func GetOfficialPrices(c *gin.Context) {
	officialPrices := model.GetAllOfficialPrices()
	common.ApiSuccess(c, gin.H{
		"items": officialPrices,
		"total": len(officialPrices),
	})
}

func SyncOfficialModelPrices(c *gin.Context) {
	if err := model.SyncOfficialPricesToModels(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "同步官方价格失败: " + err.Error(),
		})
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "官方价格同步完成",
	})
}
