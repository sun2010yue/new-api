package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/bytedance/gopkg/util/gopool"
)

const (
	pricingAlertTickInterval = 5 * time.Minute
)

var (
	pricingAlertOnce    sync.Once
	pricingAlertRunning atomic.Bool
)

// StartPricingAlertTask periodically checks for price anomalies and creates alert log entries.
func StartPricingAlertTask() {
	pricingAlertOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), fmt.Sprintf("pricing alert task started: tick=%s", pricingAlertTickInterval))
			ticker := time.NewTicker(pricingAlertTickInterval)
			defer ticker.Stop()

			runPricingAlertOnce()
			for range ticker.C {
				runPricingAlertOnce()
			}
		})
	})
}

func runPricingAlertOnce() {
	if !pricingAlertRunning.CompareAndSwap(false, true) {
		return
	}
	defer pricingAlertRunning.Store(false)

	anomalies, err := model.CheckPriceAnomalies()
	if err != nil {
		logger.LogWarn(context.Background(), fmt.Sprintf("pricing alert: check anomalies failed: %v", err))
		return
	}

	if len(anomalies) == 0 {
		return
	}

	now := common.GetTimestamp()
	for _, a := range anomalies {
		// Skip if an unread/read alert already exists for this channel+model+type
		alertType := "price_inversion"
		if a.Status == "disabled" {
			alertType = "model_disabled"
		}

		var existing int64
		model.DB.Model(&model.PriceAlertLog{}).
			Where("alert_type = ? AND channel_id = ? AND model_name = ? AND status IN (0, 1)",
				alertType, a.ChannelId, a.ModelName).
			Count(&existing)
		if existing > 0 {
			continue
		}

		msg := fmt.Sprintf("渠道 %s 模型 %s: 成本 $%.4f, 售价 $%.4f, 利润率 %.1f%%",
			a.ChannelName, a.ModelName, a.CostPrice, a.PlatformPrice, a.ProfitMargin)

		log := &model.PriceAlertLog{
			AlertType:     alertType,
			ChannelId:     a.ChannelId,
			ChannelName:   a.ChannelName,
			ModelName:     a.ModelName,
			CostPrice:     a.CostPrice,
			PlatformPrice: a.PlatformPrice,
			ProfitMargin:  a.ProfitMargin,
			Message:       msg,
			Status:        0,
			CreatedTime:   now,
		}
		if err := model.CreatePriceAlertLog(log); err != nil {
			logger.LogWarn(context.Background(), fmt.Sprintf("pricing alert: create log failed: %v", err))
			continue
		}

		// Notify root user about critical anomalies
		if a.PlatformPrice < a.CostPrice {
			NotifyRootUser("price_alert", "价格倒挂告警", msg)
		}
	}

	// Also check for low profit margin alerts
	runLowMarginCheck(now)
}

func runLowMarginCheck(now int64) {
	type LowMarginRecord struct {
		ChannelId     int
		ChannelName   string
		ModelName     string
		CostPrice     float64
		PlatformPrice float64
		ProfitMargin  float64
	}

	var records []LowMarginRecord
	model.DB.Table("channel_model_prices").
		Select("channel_model_prices.channel_id, channels.name as channel_name, channel_model_prices.model_name, channel_model_prices.cost_price, channel_model_prices.platform_price, "+
			"((channel_model_prices.platform_price - channel_model_prices.cost_price) / NULLIF(channel_model_prices.cost_price, 0) * 100) as profit_margin").
		Joins("LEFT JOIN channels ON channels.id = channel_model_prices.channel_id").
		Where("channel_model_prices.status = ? AND channel_model_prices.platform_price > channel_model_prices.cost_price "+
			"AND ((channel_model_prices.platform_price - channel_model_prices.cost_price) / NULLIF(channel_model_prices.cost_price, 0) * 100) < ?", 1, 5.0).
		Scan(&records)

	for _, r := range records {
		var existing int64
		model.DB.Model(&model.PriceAlertLog{}).
			Where("alert_type = ? AND channel_id = ? AND model_name = ? AND status IN (0, 1)",
				"profit_margin_low", r.ChannelId, r.ModelName).
			Count(&existing)
		if existing > 0 {
			continue
		}

		msg := fmt.Sprintf("渠道 %s 模型 %s: 利润率 %.1f%% (低于5%%)", r.ChannelName, r.ModelName, r.ProfitMargin)
		log := &model.PriceAlertLog{
			AlertType:     "profit_margin_low",
			ChannelId:     r.ChannelId,
			ChannelName:   r.ChannelName,
			ModelName:     r.ModelName,
			CostPrice:     r.CostPrice,
			PlatformPrice: r.PlatformPrice,
			ProfitMargin:  r.ProfitMargin,
			Message:       msg,
			Status:        0,
			CreatedTime:   now,
		}
		model.CreatePriceAlertLog(log)
	}
}
