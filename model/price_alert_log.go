package model

import "github.com/QuantumNous/new-api/common"

type PriceAlertLog struct {
	Id             int     `json:"id"`
	AlertType      string  `json:"alert_type" gorm:"size:50;index"`      // price_inversion, profit_margin_low, model_disabled
	ChannelId      int     `json:"channel_id" gorm:"index"`
	ChannelName    string  `json:"channel_name" gorm:"size:255"`
	ModelName      string  `json:"model_name" gorm:"size:255"`
	CostPrice      float64 `json:"cost_price" gorm:"type:decimal"`
	PlatformPrice  float64 `json:"platform_price" gorm:"type:decimal"`
	ProfitMargin   float64 `json:"profit_margin" gorm:"type:decimal"`
	Message        string  `json:"message" gorm:"type:text"`
	Status         int     `json:"status" gorm:"default:0"` // 0=unread 1=read 2=acknowledged
	CreatedTime    int64   `json:"created_time"`
	AcknowledgedBy int     `json:"acknowledged_by,omitempty" gorm:"default:0"`
	AcknowledgedAt int64   `json:"acknowledged_at,omitempty" gorm:"default:0"`
}

func CreatePriceAlertLog(log *PriceAlertLog) error {
	log.CreatedTime = common.GetTimestamp()
	return DB.Create(log).Error
}

func GetPriceAlertLogs(page, pageSize int) ([]PriceAlertLog, int64, error) {
	var logs []PriceAlertLog
	var total int64

	if err := DB.Model(&PriceAlertLog{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := DB.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs).Error; err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func GetUnreadPriceAlertCount() (int64, error) {
	var count int64
	err := DB.Model(&PriceAlertLog{}).Where("status = ?", 0).Count(&count).Error
	return count, err
}

func AcknowledgePriceAlert(id int, userId int) error {
	return DB.Model(&PriceAlertLog{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":         2,
		"acknowledged_by": userId,
		"acknowledged_at": common.GetTimestamp(),
	}).Error
}

func AcknowledgeAllPriceAlerts(userId int) error {
	return DB.Model(&PriceAlertLog{}).Where("status = ?", 0).Updates(map[string]interface{}{
		"status":         2,
		"acknowledged_by": userId,
		"acknowledged_at": common.GetTimestamp(),
	}).Error
}
