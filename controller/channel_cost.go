package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type ChannelCostRequest struct {
	ChannelId       int     `json:"channel_id" binding:"required"`
	CostRatio       float64 `json:"cost_ratio" binding:"required"`
	CostDescription string  `json:"cost_description"`
}

type ChannelCostUpdateRequest struct {
	CostRatio       *float64 `json:"cost_ratio"`
	CostDescription *string  `json:"cost_description"`
}

func GetAllChannelCosts(c *gin.Context) {
	costs, err := model.GetAllChannelCosts()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, costs)
}

func GetChannelCost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	cost, err := model.GetChannelCostById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "渠道成本记录不存在",
		})
		return
	}
	common.ApiSuccess(c, cost)
}

func CreateChannelCost(c *gin.Context) {
	var req ChannelCostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if req.CostRatio <= 0 || req.CostRatio > 2 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "成本折扣必须在 0.01 - 2.0 之间",
		})
		return
	}

	channel, err := model.GetChannelById(req.ChannelId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "渠道不存在",
		})
		return
	}

	cost := &model.ChannelCost{
		ChannelId:       req.ChannelId,
		CostRatio:       req.CostRatio,
		CostDescription: req.CostDescription,
	}

	if err := cost.Save(); err != nil {
		common.ApiError(c, err)
		return
	}

	userId, _ := c.Get("id")
	model.RecordLog(userId.(int), model.LogTypeSystem, "创建渠道成本: 渠道ID="+strconv.Itoa(channel.Id))

	common.ApiSuccess(c, cost)
}

func UpdateChannelCost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	var req ChannelCostUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	cost, err := model.GetChannelCostById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "渠道成本记录不存在",
		})
		return
	}

	if req.CostRatio != nil {
		if *req.CostRatio <= 0 || *req.CostRatio > 2 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "成本折扣必须在 0.01 - 2.0 之间",
			})
			return
		}
		cost.CostRatio = *req.CostRatio
	}

	if req.CostDescription != nil {
		cost.CostDescription = *req.CostDescription
	}

	if err := model.UpdateChannelCost(cost); err != nil {
		common.ApiError(c, err)
		return
	}

	userId, _ := c.Get("id")
	model.RecordLog(userId.(int), model.LogTypeSystem, "更新渠道成本: ID="+strconv.Itoa(id))

	common.ApiSuccess(c, cost)
}

func DeleteChannelCost(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	cost, err := model.GetChannelCostById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "渠道成本记录不存在",
		})
		return
	}

	if err := model.DeleteChannelCost(id); err != nil {
		common.ApiError(c, err)
		return
	}

	userId, _ := c.Get("id")
	model.RecordLog(userId.(int), model.LogTypeSystem, "删除渠道成本: 渠道ID="+strconv.Itoa(cost.ChannelId))

	common.ApiSuccess(c, nil)
}

func GetChannelCostByChannel(c *gin.Context) {
	channelId, err := strconv.Atoi(c.Query("channel_id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	cost := model.GetChannelCostOrDefault(channelId)
	common.ApiSuccess(c, cost)
}
