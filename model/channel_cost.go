package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type ChannelCost struct {
	Id               int     `json:"id"`
	ChannelId        int     `json:"channel_id"`
	CostRatio        float64 `json:"cost_ratio"`        // 成本折扣 1.0=原价 0.5=5折
	CostDescription  string  `json:"cost_description"`   // 成本说明
	CreatedTime      int64   `json:"created_time"`
	UpdatedTime      int64   `json:"updated_time"`
}

type ChannelCostWithChannel struct {
	ChannelCost
	ChannelName string `json:"channel_name"`
	ChannelTag string `json:"channel_tag"`
	Status     int    `json:"status"`
	ModelCount int    `json:"model_count"`
}

func GetChannelCostByChannelId(channelId int) (*ChannelCost, error) {
	var cost ChannelCost
	err := DB.Where("channel_id = ?", channelId).First(&cost).Error
	if err != nil {
		return nil, err
	}
	return &cost, nil
}

func GetAllChannelCosts() ([]ChannelCostWithChannel, error) {
	var results []ChannelCostWithChannel
	err := DB.Table("channel_costs").
		Select("channel_costs.*, channels.name as channel_name, channels.tag as channel_tag, channels.status").
		Joins("LEFT JOIN channels ON channels.id = channel_costs.channel_id").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	for i := range results {
		modelCount, _ := CountModelsByChannelId(results[i].ChannelId)
		results[i].ModelCount = modelCount
	}

	return results, nil
}

func CountModelsByChannelId(channelId int) (int, error) {
	var channel Channel
	err := DB.First(&channel, "id = ?", channelId).Error
	if err != nil {
		return 0, err
	}

	if channel.Models == "" {
		return 0, nil
	}

	models := strings.Split(strings.Trim(channel.Models, ","), ",")
	return len(models), nil
}

func (c *ChannelCost) Save() error {
	var existing ChannelCost
	err := DB.Where("channel_id = ?", c.ChannelId).First(&existing).Error
	if err != nil {
		c.CreatedTime = common.GetTimestamp()
		c.UpdatedTime = common.GetTimestamp()
		return DB.Create(c).Error
	}

	c.Id = existing.Id
	c.UpdatedTime = common.GetTimestamp()
	return DB.Save(c).Error
}

func (c *ChannelCost) Delete() error {
	return DB.Delete(c, "channel_id = ?", c.ChannelId).Error
}

func GetChannelCostById(id int) (*ChannelCost, error) {
	var cost ChannelCost
	err := DB.First(&cost, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &cost, nil
}

func CreateChannelCost(cost *ChannelCost) error {
	cost.CreatedTime = common.GetTimestamp()
	cost.UpdatedTime = common.GetTimestamp()
	return DB.Create(cost).Error
}

func UpdateChannelCost(cost *ChannelCost) error {
	cost.UpdatedTime = common.GetTimestamp()
	return DB.Save(cost).Error
}

func DeleteChannelCost(id int) error {
	return DB.Delete(&ChannelCost{}, "id = ?", id).Error
}

func GetChannelCostOrDefault(channelId int) *ChannelCost {
	cost, err := GetChannelCostByChannelId(channelId)
	if err != nil {
		return &ChannelCost{
			ChannelId: channelId,
			CostRatio: 1.0,
		}
	}
	return cost
}
