package model

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

type ChannelModelPrice struct {
	Id             int     `json:"id"`
	ChannelId      int     `json:"channel_id"`
	ModelName      string  `json:"model_name"`
	UpstreamPrice  float64 `json:"upstream_price"`            // 上游官方输入价格(美元/1M tokens)
	UpstreamOutputPrice float64 `json:"upstream_output_price"` // 上游官方输出价格(美元/1M tokens)
	UpstreamCachePrice  float64 `json:"upstream_cache_price"`  // 上游官方缓存读取价格(美元/1M tokens)
	CostPrice      float64 `json:"cost_price"`            // 渠道输入成本价格(美元/1M tokens)
	CostOutputPrice float64 `json:"cost_output_price"`    // 渠道输出成本价格(美元/1M tokens)
	CostCachePrice  float64 `json:"cost_cache_price"`     // 渠道缓存读取成本价格(美元/1M tokens)
	PlatformRatio  float64 `json:"platform_ratio"`        // 平台折扣倍率(模式1)或利润率百分比(模式2)
	PlatformPrice  float64 `json:"platform_price"`        // 平台输入售价(美元/1M tokens)
	PlatformOutputPrice float64 `json:"platform_output_price"` // 平台输出售价(美元/1M tokens)
	PlatformCachePrice  float64 `json:"platform_cache_price"`  // 平台缓存读取售价(美元/1M tokens)
	PricingMode    int     `json:"pricing_mode" gorm:"default:1"` // 1=折扣率模式 2=利润率模式
	Status         int     `json:"status"`                // 1=启用 0=禁用
	CreatedTime    int64   `json:"created_time"`
	UpdatedTime    int64   `json:"updated_time"`
}

type ChannelModelPriceWithDetails struct {
	ChannelModelPrice
	ChannelName string  `json:"channel_name"`
	ChannelTag  string  `json:"channel_tag"`
	CostRatio   float64 `json:"cost_ratio"`
	ProfitMargin float64 `json:"profit_margin"` // 利润率百分比
}

func GetChannelModelPrices(channelId int, modelFilter string) ([]ChannelModelPriceWithDetails, error) {
	var prices []ChannelModelPriceWithDetails

	query := DB.Table("channel_model_prices").
		Select("channel_model_prices.*, channels.name as channel_name, channels.tag as channel_tag").
		Joins("LEFT JOIN channels ON channels.id = channel_model_prices.channel_id")

	if channelId > 0 {
		query = query.Where("channel_model_prices.channel_id = ?", channelId)
	}

	if modelFilter != "" && modelFilter != "all" {
		modelFilter = strings.ToLower(modelFilter)
		query = query.Where("LOWER(channel_model_prices.model_name) LIKE ?", "%"+modelFilter+"%")
	}

	err := query.Scan(&prices).Error
	if err != nil {
		return nil, err
	}

	for i := range prices {
		cost, _ := GetChannelCostByChannelId(prices[i].ChannelId)
		if cost != nil {
			prices[i].CostRatio = cost.CostRatio
		}
		prices[i].ProfitMargin = CalculateProfitMargin(prices[i].PlatformPrice, prices[i].CostPrice)
	}

	return prices, nil
}

func GetChannelModelPricesByIds(ids []int) ([]ChannelModelPrice, error) {
	var prices []ChannelModelPrice
	err := DB.Where("id IN ?", ids).Find(&prices).Error
	return prices, err
}

func GetChannelModelPriceById(id int) (*ChannelModelPrice, error) {
	var price ChannelModelPrice
	err := DB.First(&price, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &price, nil
}

func GetChannelModelPriceByChannelAndModel(channelId int, modelName string) (*ChannelModelPrice, error) {
	var price ChannelModelPrice
	err := DB.Where("channel_id = ? AND model_name = ?", channelId, modelName).First(&price).Error
	if err != nil {
		return nil, err
	}
	return &price, nil
}

func (p *ChannelModelPrice) Save() error {
	var existing ChannelModelPrice
	err := DB.Where("channel_id = ? AND model_name = ?", p.ChannelId, p.ModelName).First(&existing).Error
	if err != nil {
		p.CreatedTime = common.GetTimestamp()
		p.UpdatedTime = common.GetTimestamp()
		return DB.Create(p).Error
	}

	p.Id = existing.Id
	p.UpdatedTime = common.GetTimestamp()
	return DB.Save(p).Error
}

func (p *ChannelModelPrice) Delete() error {
	return DB.Delete(p, "id = ?", p.Id).Error
}

func CreateChannelModelPrice(price *ChannelModelPrice) error {
	price.CreatedTime = common.GetTimestamp()
	price.UpdatedTime = common.GetTimestamp()
	return DB.Create(price).Error
}

func UpdateChannelModelPrice(price *ChannelModelPrice) error {
	price.UpdatedTime = common.GetTimestamp()
	return DB.Save(price).Error
}

func DeleteChannelModelPrice(id int) error {
	return DB.Delete(&ChannelModelPrice{}, "id = ?", id).Error
}

func UpdateChannelSyncStatus(channelId int, status int) error {
	return DB.Model(&Channel{}).Where("id = ?", channelId).Updates(map[string]interface{}{
		"sync_status":    status,
		"last_sync_time": common.GetTimestamp(),
	}).Error
}

func GetUpstreamPriceForModel(modelName string) float64 {
	// Use official price library first (more accurate for known models)
	if price, ok := GetOfficialPrice(modelName); ok {
		return price
	}
	// Fall back to model ratio calculation
	ratio, _, _ := ratio_setting.GetModelRatio(modelName)
	if ratio == 0 {
		ratio = 37.5
	}
	return ratio / 500.0
}

// GetUpstreamPricesDerived returns input, output and cache read upstream prices
// for a model. Checks official price library first, then derives from ratio_setting.
func GetUpstreamPricesDerived(modelName string) (inputPrice, outputPrice, cachePrice float64) {
	inputPrice = GetUpstreamPriceForModel(modelName)

	// Check official price library for precise output/cache prices
	if prices, ok := GetOfficialModelPrices(modelName); ok {
		return prices.Input, prices.Output, prices.CacheRead
	}

	// Derive output price from completion ratio
	completionRatio := ratio_setting.GetCompletionRatio(modelName)
	outputPrice = inputPrice * completionRatio

	// Derive cache price from cache ratio
	cacheP, ok := ratio_setting.GetCacheRatio(modelName)
	if ok {
		cachePrice = inputPrice * cacheP
	} else {
		cachePrice = inputPrice
	}

	return
}

// SyncOfficialPricesToModels iterates all models in the DB and populates their
// official_price_* fields from the official price library or ratio_setting.
// Should be called after upstream ratio sync completes.
func SyncOfficialPricesToModels() error {
	var models []Model
	if err := DB.Where("deleted_at IS NULL").Find(&models).Error; err != nil {
		return err
	}
	for i := range models {
		inputPrice, outputPrice, cachePrice := GetUpstreamPricesDerived(models[i].ModelName)
		if inputPrice == 0 && outputPrice == 0 && cachePrice == 0 {
			continue
		}
		// Avoid zeroing out previously set values if the lookup failed
		updates := map[string]interface{}{
			"official_price_input":  inputPrice,
			"official_price_output": outputPrice,
			"official_price_cache":  cachePrice,
			"updated_time":          common.GetTimestamp(),
		}
		DB.Model(&models[i]).Updates(updates)
	}
	return nil
}

func SyncModelRatioToPricing(modelName string, platformPrice float64) error {
	ratios := ratio_setting.GetModelRatioCopy()
	ratios[modelName] = platformPrice * 500.0
	jsonStr, err := common.Marshal(ratios)
	if err != nil {
		return err
	}
	return ratio_setting.UpdateModelRatioByJSONString(string(jsonStr))
}

func CalculateProfitMargin(platformPrice, costPrice float64) float64 {
	if costPrice <= 0 {
		return 0
	}
	return ((platformPrice - costPrice) / costPrice) * 100
}

func ValidatePriceAntiInversion(platformPrice, costPrice float64) (bool, string) {
	if platformPrice < costPrice {
		return false, fmt.Sprintf("价格倒挂: 平台售价 $%.4f < 渠道成本 $%.4f", platformPrice, costPrice)
	}
	return true, ""
}

func SyncChannelPrices(channelId int, dryRun bool) (*SyncResult, error) {
	channel, err := GetChannelById(channelId, false)
	if err != nil {
		return nil, err
	}

	cost, err := GetChannelCostByChannelId(channelId)
	if err != nil {
		cost = &ChannelCost{ChannelId: channelId, CostRatio: 1.0}
	}

	result := &SyncResult{
		ChannelId:     channelId,
		ChannelName:   channel.Name,
		AffectedCount: 0,
		PriceChanges:  []PriceChange{},
		Warnings:      []string{},
		Blocked:       false,
	}

	if channel.Models == "" {
		return result, nil
	}

	models := strings.Split(strings.Trim(channel.Models, ","), ",")

	for _, modelName := range models {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			continue
		}

		upstreamPrice, upstreamOutputPrice, upstreamCachePrice := GetUpstreamPricesDerived(modelName)
		costPrice := upstreamPrice * cost.CostRatio

			costOutputPrice := upstreamOutputPrice * cost.CostRatio
			costCachePrice := upstreamCachePrice * cost.CostRatio
			existingPrice, err := GetChannelModelPriceByChannelAndModel(channelId, modelName)
		if err != nil {
			existingPrice = &ChannelModelPrice{
				ChannelId:     channelId,
				ModelName:     modelName,
				UpstreamPrice: upstreamPrice,
				UpstreamOutputPrice: upstreamOutputPrice,
				UpstreamCachePrice:  upstreamCachePrice,
				CostPrice:     costPrice,
				CostOutputPrice: costOutputPrice,
				CostCachePrice: costCachePrice,
				PlatformRatio: cost.CostRatio,
				PlatformPrice: upstreamPrice * cost.CostRatio,
				PlatformOutputPrice: upstreamOutputPrice * cost.CostRatio,
				PlatformCachePrice:  upstreamCachePrice * cost.CostRatio,
				Status:        1,
			}
		}

		change := PriceChange{
			ModelName:         modelName,
			UpstreamPrice:     upstreamPrice,
			CostPrice:         costPrice,
			OldPlatformPrice:  existingPrice.PlatformPrice,
			NewPlatformPrice:  existingPrice.PlatformPrice,
			ProfitMargin:      CalculateProfitMargin(existingPrice.PlatformPrice, costPrice),
			Status:            "unchanged",
		}

		if !dryRun {
			if existingPrice.Id == 0 {
				existingPrice.UpstreamPrice = upstreamPrice
				existingPrice.UpstreamOutputPrice = upstreamOutputPrice
				existingPrice.UpstreamCachePrice = upstreamCachePrice
				existingPrice.CostPrice = costPrice
				existingPrice.CostOutputPrice = costOutputPrice
				existingPrice.CostCachePrice = costCachePrice
				existingPrice.PlatformRatio = cost.CostRatio
				existingPrice.PricingMode = 1
				existingPrice.PlatformPrice = upstreamPrice * cost.CostRatio
				existingPrice.PlatformOutputPrice = upstreamOutputPrice * cost.CostRatio
				existingPrice.PlatformCachePrice = upstreamCachePrice * cost.CostRatio
				CreateChannelModelPrice(existingPrice)
				change.Status = "created"
				result.AffectedCount++
			} else if existingPrice.UpstreamPrice != upstreamPrice {
				existingPrice.UpstreamPrice = upstreamPrice
				existingPrice.UpstreamOutputPrice = upstreamOutputPrice
				existingPrice.UpstreamCachePrice = upstreamCachePrice
				existingPrice.CostPrice = costPrice
				existingPrice.CostOutputPrice = costOutputPrice
				existingPrice.CostCachePrice = costCachePrice
				if existingPrice.PricingMode == 2 {
					existingPrice.PlatformPrice = costPrice * (1 + existingPrice.PlatformRatio/100)
					existingPrice.PlatformOutputPrice = costOutputPrice * (1 + existingPrice.PlatformRatio/100)
					existingPrice.PlatformCachePrice = costCachePrice * (1 + existingPrice.PlatformRatio/100)
				} else {
					existingPrice.PlatformPrice = upstreamPrice * existingPrice.PlatformRatio
					existingPrice.PlatformOutputPrice = upstreamOutputPrice * existingPrice.PlatformRatio
					existingPrice.PlatformCachePrice = upstreamCachePrice * existingPrice.PlatformRatio
				}
				UpdateChannelModelPrice(existingPrice)
				change.NewPlatformPrice = existingPrice.PlatformPrice
				change.ProfitMargin = CalculateProfitMargin(existingPrice.PlatformPrice, costPrice)
				change.Status = "updated"
				result.AffectedCount++
			}
		}

		result.PriceChanges = append(result.PriceChanges, change)
	}

	if !dryRun {
		// Write back model_ratio for billing compatibility
		for _, c := range result.PriceChanges {
			if c.Status == "created" || c.Status == "updated" {
				SyncModelRatioToPricing(c.ModelName, c.NewPlatformPrice)
			}
		}
		UpdateChannelSyncStatus(channelId, 1)
	}
	return result, nil
}

type SyncResult struct {
	ChannelId     int            `json:"channel_id"`
	ChannelName   string         `json:"channel_name"`
	AffectedCount int            `json:"affected_count"`
	PriceChanges  []PriceChange  `json:"price_changes"`
	Warnings      []string       `json:"warnings"`
	Blocked       bool           `json:"blocked"`
}

type PriceChange struct {
	ModelName         string  `json:"model_name"`
	UpstreamPrice     float64 `json:"upstream_price"`
	CostPrice         float64 `json:"cost_price"`
	OldPlatformPrice  float64 `json:"old_platform_price"`
	NewPlatformPrice  float64 `json:"new_platform_price"`
	ProfitMargin      float64 `json:"profit_margin"`
	Status            string  `json:"status"`
}

type BatchUpdateResult struct {
	ChannelId      int            `json:"channel_id"`
	AffectedModels int            `json:"affected_models"`
	PriceChanges   []PriceChange  `json:"price_changes"`
	Warnings       []string       `json:"warnings"`
	Blocked        bool           `json:"blocked"`
}

func BatchUpdateChannelPricing(channelId int, ratio float64, modelFilter string, dryRun bool, pricingMode int) (*BatchUpdateResult, error) {
	cost, err := GetChannelCostByChannelId(channelId)
	if err != nil {
		cost = &ChannelCost{ChannelId: channelId, CostRatio: 1.0}
	}

	result := &BatchUpdateResult{
		ChannelId:      channelId,
		AffectedModels: 0,
		PriceChanges:   []PriceChange{},
		Warnings:       []string{},
		Blocked:        false,
	}

	var prices []ChannelModelPrice
	query := DB.Where("channel_id = ?", channelId)
	if modelFilter != "" && modelFilter != "all" {
		modelFilter = strings.ToLower(modelFilter)
		query = query.Where("LOWER(model_name) LIKE ?", "%"+modelFilter+"%")
	}
	query.Find(&prices)

	if len(prices) == 0 {
		return result, nil
	}


	// Pass 1: validate all models and collect changes
	hasBlocked := false
	for i := range prices {
		upstreamPrice := prices[i].UpstreamPrice
		costPrice := upstreamPrice * cost.CostRatio

		var newPlatformPrice float64
		if pricingMode == 2 {
			newPlatformPrice = costPrice * (1 + ratio/100)
		} else {
			newPlatformPrice = upstreamPrice * ratio
		}

		valid, msg := ValidatePriceAntiInversion(newPlatformPrice, costPrice)
		if !valid {
			result.Warnings = append(result.Warnings, fmt.Sprintf("模型 %s: %s", prices[i].ModelName, msg))
			hasBlocked = true
		}

		status := "updated"
		if !valid {
			status = "blocked"
		}
		result.PriceChanges = append(result.PriceChanges, PriceChange{
			ModelName:        prices[i].ModelName,
			UpstreamPrice:    upstreamPrice,
			CostPrice:        costPrice,
			OldPlatformPrice: prices[i].PlatformPrice,
			NewPlatformPrice: newPlatformPrice,
			ProfitMargin:     CalculateProfitMargin(newPlatformPrice, costPrice),
			Status:           status,
		})
	}
	result.Blocked = hasBlocked

	// Pass 2: apply updates only when not blocked
	if !dryRun && !hasBlocked {
		for i := range prices {
			upstreamPrice := prices[i].UpstreamPrice
			_, upstreamOutputPrice, upstreamCachePrice := GetUpstreamPricesDerived(prices[i].ModelName)
			costPrice := upstreamPrice * cost.CostRatio
			costOutputPrice := upstreamOutputPrice * cost.CostRatio
			costCachePrice := upstreamCachePrice * cost.CostRatio

			var newPlatformPrice float64
			var newPlatformOutputPrice float64
			var newPlatformCachePrice float64
			if pricingMode == 2 {
				newPlatformPrice = costPrice * (1 + ratio/100)
				newPlatformOutputPrice = costOutputPrice * (1 + ratio/100)
				newPlatformCachePrice = costCachePrice * (1 + ratio/100)
			} else {
				newPlatformPrice = upstreamPrice * ratio
				newPlatformOutputPrice = upstreamOutputPrice * ratio
				newPlatformCachePrice = upstreamCachePrice * ratio
			}

			prices[i].PricingMode = pricingMode
			prices[i].PlatformRatio = ratio
			prices[i].PlatformPrice = newPlatformPrice
			prices[i].PlatformOutputPrice = newPlatformOutputPrice
			prices[i].PlatformCachePrice = newPlatformCachePrice
			prices[i].CostPrice = costPrice
			prices[i].CostOutputPrice = costOutputPrice
			prices[i].CostCachePrice = costCachePrice
			prices[i].UpstreamOutputPrice = upstreamOutputPrice
			prices[i].UpstreamCachePrice = upstreamCachePrice
			UpdateChannelModelPrice(&prices[i])
			SyncModelRatioToPricing(prices[i].ModelName, newPlatformPrice)
			result.AffectedModels++
		}
	}

	return result, nil
}

func CheckPriceAnomalies() ([]PriceAnomaly, error) {
	var anomalies []PriceAnomaly
	var prices []ChannelModelPriceWithDetails

	DB.Table("channel_model_prices").
		Select("channel_model_prices.*, channels.name as channel_name, channels.tag as channel_tag").
		Joins("LEFT JOIN channels ON channels.id = channel_model_prices.channel_id").
		Where("channel_model_prices.platform_price < channel_model_prices.cost_price").
		Or("channel_model_prices.status = ?", 0).
		Scan(&prices)

	for _, p := range prices {
		margin := CalculateProfitMargin(p.PlatformPrice, p.CostPrice)
		status := "normal"
		if p.PlatformPrice < p.CostPrice {
			status = "loss"
		} else if p.Status == 0 {
			status = "disabled"
		}
		anomalies = append(anomalies, PriceAnomaly{
			ChannelId:     p.ChannelId,
			ChannelName:   p.ChannelName,
			ModelName:     p.ModelName,
			CostPrice:     p.CostPrice,
			PlatformPrice: p.PlatformPrice,
			ProfitMargin: margin,
			Status:        status,
		})
	}

	return anomalies, nil
}

type PriceAnomaly struct {
	ChannelId     int     `json:"channel_id"`
	ChannelName   string  `json:"channel_name"`
	ModelName     string  `json:"model_name"`
	CostPrice     float64 `json:"cost_price"`
	PlatformPrice float64 `json:"platform_price"`
	ProfitMargin  float64 `json:"profit_margin"`
	Status        string  `json:"status"`
}

func GetPricingStats() (*PricingStats, error) {
	var totalChannels int64
	if err := DB.Model(&Channel{}).Count(&totalChannels).Error; err != nil {
		return nil, err
	}

	var activeChannels int64
	if err := DB.Model(&Channel{}).Where("status = ?", common.ChannelStatusEnabled).Count(&activeChannels).Error; err != nil {
		return nil, err
	}

	var totalModelPrices int64
	if err := DB.Model(&ChannelModelPrice{}).Count(&totalModelPrices).Error; err != nil {
		return nil, err
	}

	var costs []ChannelCostWithChannel
	if err := DB.Table("channel_costs").
		Select("channel_costs.*, channels.name as channel_name, channels.tag as channel_tag, channels.status").
		Joins("LEFT JOIN channels ON channels.id = channel_costs.channel_id").
		Scan(&costs).Error; err != nil {
		return nil, err
	}

	channelStats := make([]ChannelStat, 0, len(costs))
	for _, c := range costs {
		modelCount, err := CountModelsByChannelId(c.ChannelId)
		if err != nil {
			return nil, err
		}
		avgMargin, err := GetAverageProfitMargin(c.ChannelId)
		if err != nil {
			return nil, err
		}
		channelStats = append(channelStats, ChannelStat{
			ChannelId:         c.ChannelId,
			ChannelName:       c.ChannelName,
			ChannelTag:        c.ChannelTag,
			CostRatio:         c.CostRatio,
			ModelCount:        modelCount,
			AvgProfitMargin:   avgMargin,
			Status:            getStatusText(c.Status),
		})
	}

	anomalies, err := CheckPriceAnomalies()
	if err != nil {
		return nil, err
	}

	return &PricingStats{
		TotalChannels:  int(totalChannels),
		ActiveChannels: int(activeChannels),
		TotalModels:   int(totalModelPrices),
		ChannelStats:  channelStats,
		PriceAnomalies: anomalies,
	}, nil
}

type PricingStats struct {
	TotalChannels   int             `json:"total_channels"`
	ActiveChannels  int             `json:"active_channels"`
	TotalModels     int             `json:"total_models"`
	ChannelStats    []ChannelStat   `json:"channel_stats"`
	PriceAnomalies  []PriceAnomaly  `json:"price_anomalies"`
}

type ChannelStat struct {
	ChannelId        int     `json:"channel_id"`
	ChannelName      string  `json:"channel_name"`
	ChannelTag       string  `json:"channel_tag"`
	CostRatio        float64 `json:"cost_ratio"`
	ModelCount       int     `json:"model_count"`
	AvgProfitMargin  float64 `json:"avg_profit_margin"`
	Status           string  `json:"status"`
}

func GetAverageProfitMargin(channelId int) (float64, error) {
	var result struct {
		AvgMargin float64
	}
	err := DB.Model(&ChannelModelPrice{}).
		Where("channel_id = ?", channelId).
		Select("COALESCE(AVG((platform_price - cost_price) / NULLIF(cost_price, 0) * 100), 0) as avg_margin").
		Scan(&result).Error
	if err != nil {
		return 0, err
	}
	return result.AvgMargin, nil
}

func getStatusText(status int) string {
	switch status {
	case common.ChannelStatusEnabled:
		return "online"
	case common.ChannelStatusAutoDisabled, common.ChannelStatusManuallyDisabled:
		return "disabled"
	default:
		return "offline"
	}
}
