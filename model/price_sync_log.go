package model

import (
	"github.com/QuantumNous/new-api/common"
)

type PriceSyncLog struct {
	Id           int     `json:"id"`
	ChannelId    *int    `json:"channel_id"`
	Action       string  `json:"action"`                  // sync/batch_update/single_update
	ModelsCount  int     `json:"models_count"`           // 影响的模型数量
	BeforeData   string  `json:"before_data,omitempty"`   // 操作前数据(JSON)
	AfterData    string  `json:"after_data,omitempty"`    // 操作后数据(JSON)
	OperatorId   *int    `json:"operator_id,omitempty"`   // 操作人ID
	Result       string  `json:"result"`                  // success/failed
	ErrorMessage string  `json:"error_message,omitempty"` // 错误信息
	CreatedTime  int64   `json:"created_time"`
}

func CreatePriceSyncLog(log *PriceSyncLog) error {
	log.CreatedTime = common.GetTimestamp()
	return DB.Create(log).Error
}

func GetPriceSyncLogs(channelId int, page, pageSize int) ([]PriceSyncLog, int64, error) {
	var logs []PriceSyncLog
	var total int64

	query := DB.Model(&PriceSyncLog{})
	if channelId > 0 {
		query = query.Where("channel_id = ?", channelId)
	}

	query.Count(&total)
	query.Order("created_time DESC").Limit(pageSize).Offset((page - 1) * pageSize).Find(&logs)

	return logs, total, nil
}

func DeletePriceSyncLogs(daysOld int) (int64, error) {
	cutoffTime := common.GetTimestamp() - int64(daysOld*24*60*60)
	result := DB.Where("created_time < ?", cutoffTime).Delete(&PriceSyncLog{})
	return result.RowsAffected, result.Error
}
