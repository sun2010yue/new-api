-- New API Multi-Channel Pricing System Database Migration
-- Version: v1.0
-- Date: 2026-05-15

-- ============================================
-- Table: channel_costs
-- Description: 渠道成本表
-- ============================================
CREATE TABLE IF NOT EXISTS `channel_costs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `channel_id` INT NOT NULL COMMENT '关联渠道ID',
    `cost_ratio` DECIMAL(10,6) NOT NULL DEFAULT 1.000000 COMMENT '上游成本折扣 1.0=原价 0.5=5折',
    `cost_description` VARCHAR(255) DEFAULT '' COMMENT '成本说明',
    `created_time` BIGINT NOT NULL COMMENT '创建时间戳',
    `updated_time` BIGINT NOT NULL COMMENT '更新时间戳',
    UNIQUE KEY `uk_channel_id` (`channel_id`),
    INDEX `idx_channel_id` (`channel_id`),
    FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: channel_model_prices
-- Description: 渠道模型价格表
-- ============================================
CREATE TABLE IF NOT EXISTS `channel_model_prices` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `channel_id` INT NOT NULL COMMENT '关联渠道ID',
    `model_name` VARCHAR(255) NOT NULL COMMENT '模型名称',
    `upstream_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '上游官方输入价格(美元/1M tokens)',
    `upstream_output_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '上游官方输出价格(美元/1M tokens)',
    `upstream_cache_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '上游官方缓存读取价格(美元/1M tokens)',
    `cost_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '渠道输入成本价格(美元/1M tokens)',
    `cost_output_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '渠道输出成本价格(美元/1M tokens)',
    `cost_cache_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '渠道缓存读取成本价格(美元/1M tokens)',
    `platform_ratio` DECIMAL(10,6) NOT NULL DEFAULT 1.000000 COMMENT '平台折扣倍率(模式1)或利润率百分比(模式2)',
    `platform_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '平台输入售价(美元/1M tokens)',
    `platform_output_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '平台输出售价(美元/1M tokens)',
    `platform_cache_price` DECIMAL(15,6) NOT NULL DEFAULT 0.000000 COMMENT '平台缓存读取售价(美元/1M tokens)',
    `pricing_mode` TINYINT DEFAULT 1 COMMENT '定价模式 1=折扣率模式 2=利润率模式',
    `status` TINYINT DEFAULT 1 COMMENT '状态 1=启用 0=禁用',
    `created_time` BIGINT NOT NULL,
    `updated_time` BIGINT NOT NULL,
    UNIQUE KEY `uk_channel_model` (`channel_id`, `model_name`),
    INDEX `idx_model_name` (`model_name`),
    INDEX `idx_channel_id` (`channel_id`),
    FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: price_sync_logs
-- Description: 价格同步日志表
-- ============================================
CREATE TABLE IF NOT EXISTS `price_sync_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `channel_id` INT DEFAULT NULL COMMENT '关联渠道ID',
    `action` VARCHAR(50) NOT NULL COMMENT '操作类型 sync/batch_update/single_update',
    `models_count` INT DEFAULT 0 COMMENT '影响的模型数量',
    `before_data` TEXT COMMENT '操作前数据(JSON)',
    `after_data` TEXT COMMENT '操作后数据(JSON)',
    `operator_id` INT DEFAULT NULL COMMENT '操作人ID',
    `result` VARCHAR(20) DEFAULT 'success' COMMENT '结果 success/failed',
    `error_message` TEXT COMMENT '错误信息',
    `created_time` BIGINT NOT NULL,
    INDEX `idx_channel_id` (`channel_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_created_time` (`created_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- Channels Table Additions
-- Description: 渠道表新增同步字段
-- ============================================
ALTER TABLE `channels`
    ADD COLUMN `last_sync_time` BIGINT NOT NULL DEFAULT 0 COMMENT '最后一次同步时间',
    ADD COLUMN `sync_status` TINYINT NOT NULL DEFAULT 0 COMMENT '同步状态 0=未同步 1=同步成功 2=同步失败';

-- ============================================
-- Models Table Additions
-- Description: 模型表新增官方价格参考字段
-- ============================================
ALTER TABLE `models`
    ADD COLUMN `official_price_input` DECIMAL(15,6) NOT NULL DEFAULT 0 COMMENT '官方输入价格(美元/1M tokens)',
    ADD COLUMN `official_price_output` DECIMAL(15,6) NOT NULL DEFAULT 0 COMMENT '官方输出价格(美元/1M tokens)',
    ADD COLUMN `official_price_cache` DECIMAL(15,6) NOT NULL DEFAULT 0 COMMENT '官方缓存读取价格(美元/1M tokens)';

-- ============================================
-- Sample Data for Testing
-- ============================================

-- Insert sample channel costs (assuming channel IDs 1, 2, 3 exist)
-- INSERT INTO `channel_costs` (`channel_id`, `cost_ratio`, `cost_description`, `created_time`, `updated_time`)
-- VALUES
--     (1, 0.500000, '渠道A 上游5折成本', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
--     (2, 0.600000, '渠道B 上游6折成本', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- ============================================
-- Rollback Script (if needed)
-- ============================================
-- DROP TABLE IF EXISTS `price_sync_logs`;
-- DROP TABLE IF EXISTS `channel_model_prices`;
-- DROP TABLE IF EXISTS `channel_costs`;
