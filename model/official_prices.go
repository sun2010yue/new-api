package model

import "strings"

// ModelPrices holds the official upstream prices (USD per 1M tokens)
// for a given model from its provider.
type ModelPrices struct {
	Input       float64 `json:"input"`
	Output      float64 `json:"output"`
	CacheRead   float64 `json:"cache_read"`
}

// OfficialModelPrices contains the official upstream prices for mainstream
// AI models. Used as the source of truth for upstream price when syncing
// channel pricing. Values sourced from each provider's published pricing
// as of 2026-05.
var OfficialModelPrices = map[string]ModelPrices{
	// ── OpenAI ──
	"gpt-4o":            {2.50, 10.00, 1.25},
	"gpt-4o-2024":       {2.50, 10.00, 1.25},
	"gpt-4o-mini":       {0.15, 0.60, 0.075},
	"gpt-4o-mini-2024":  {0.15, 0.60, 0.075},
	"gpt-4-turbo":       {10.00, 30.00, 5.00},
	"gpt-4":             {30.00, 60.00, 15.00},
	"gpt-4-32k":         {60.00, 120.00, 30.00},
	"gpt-3.5-turbo":     {0.50, 1.50, 0.25},
	"o1":                {15.00, 60.00, 7.50},
	"o1-mini":           {1.10, 4.40, 0.55},
	"o3-mini":           {1.10, 4.40, 0.55},

	// ── Anthropic ──
	"claude-3-5-sonnet": {3.00, 15.00, 0.30},
	"claude-3-5-haiku":  {0.80, 4.00, 0.08},
	"claude-3-opus":     {15.00, 75.00, 1.50},
	"claude-3-sonnet":   {3.00, 15.00, 0.30},
	"claude-3-haiku":    {0.25, 1.25, 0.025},
	"claude-4-sonnet":   {3.00, 15.00, 0.30},
	"claude-4-opus":     {15.00, 75.00, 1.50},

	// ── Google Gemini ──
	"gemini-2.0-flash":  {0.10, 0.40, 0.025},
	"gemini-2.0-pro":    {1.25, 5.00, 0.3125},
	"gemini-1.5-pro":    {1.25, 5.00, 0.3125},
	"gemini-1.5-flash":  {0.075, 0.30, 0.01875},
	"gemini-1.5-flash-8b": {0.0375, 0.15, 0.0075},

	// ── DeepSeek ──
	"deepseek-chat":     {0.27, 1.10, 0.07},
	"deepseek-reasoner": {0.55, 2.19, 0.14},

	// ── Other models (estimated or community agreed prices) ──
	"qwen-turbo":        {0.30, 1.20, 0.15},
	"qwen-plus":         {0.80, 2.00, 0.40},
	"qwen-max":          {2.00, 6.00, 1.00},
	"glm-4":             {1.00, 2.00, 0.50},
	"moonshot-v1":       {1.00, 2.00, 0.50},
	"mistral-large":     {2.00, 6.00, 1.00},
	"mistral-medium":    {0.70, 2.10, 0.35},
	"mistral-small":     {0.20, 0.60, 0.10},
	"llama-3-8b":        {0.05, 0.15, 0.025},
	"llama-3-70b":       {0.25, 0.75, 0.125},
	"llama-3-405b":      {0.80, 2.40, 0.40},
}

// GetOfficialPrice looks up a model name in the official price library
// and returns the input price. Performs exact then prefix match.
func GetOfficialPrice(modelName string) (float64, bool) {
	prices, ok := GetOfficialModelPrices(modelName)
	if ok {
		return prices.Input, true
	}
	return 0, false
}

// GetOfficialModelPrices looks up all price tiers for a model.
func GetOfficialModelPrices(modelName string) (ModelPrices, bool) {
	normalized := strings.ToLower(modelName)

	if prices, ok := OfficialModelPrices[normalized]; ok {
		return prices, true
	}

	// Prefix match: find longest matching key
	matchedKey := ""
	var matchedPrices ModelPrices
	for key, prices := range OfficialModelPrices {
		if strings.HasPrefix(normalized, key) && len(key) > len(matchedKey) {
			matchedKey = key
			matchedPrices = prices
		}
	}
	if matchedKey != "" {
		return matchedPrices, true
	}

	return ModelPrices{}, false
}

// GetAllOfficialPrices returns all entries for API display.
type OfficialPriceEntry struct {
	ModelName string  `json:"model_name"`
	Price     float64 `json:"price"`
	Output    float64 `json:"output"`
	CacheRead float64 `json:"cache_read"`
}

func GetAllOfficialPrices() []OfficialPriceEntry {
	entries := make([]OfficialPriceEntry, 0, len(OfficialModelPrices))
	for name, prices := range OfficialModelPrices {
		entries = append(entries, OfficialPriceEntry{
			ModelName: name,
			Price:     prices.Input,
			Output:    prices.Output,
			CacheRead: prices.CacheRead,
		})
	}
	return entries
}
