import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Button,
  Toast,
  Typography,
  Table,
  Space,
  Banner,
} from '@douyinfe/semi-ui';
import { batchUpdateChannelPricing } from '../../../../services/channelCostService';

const { Text } = Typography;

const BatchPricingModal = ({
  visible,
  channels,
  channelCosts,
  defaultChannelId,
  onClose,
  onBatchUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [formValues, setFormValues] = useState({
    channel_id: defaultChannelId || '',
    model_filter: 'all',
    platform_ratio: 1.0,
    pricing_mode: 1,
    dry_run: true,
  });

  useEffect(() => {
    if (defaultChannelId) {
      setFormValues((prev) => ({ ...prev, channel_id: defaultChannelId }));
    }
  }, [defaultChannelId]);

  const selectedChannelCost = useMemo(() => {
    if (!formValues.channel_id) return null;
    return channelCosts.find((c) => c.channel_id === formValues.channel_id);
  }, [formValues.channel_id, channelCosts]);

  const handlePreview = async () => {
    if (!formValues.channel_id) {
      Toast.error('请选择渠道');
      return;
    }
    if (formValues.pricing_mode === 2) {
      if (formValues.platform_ratio <= 0 || formValues.platform_ratio > 500) {
        Toast.error('利润率必须在 0.1% - 500% 之间');
        return;
      }
    } else {
      if (formValues.platform_ratio <= 0 || formValues.platform_ratio > 3) {
        Toast.error('折扣必须在 0.01 - 3.0 之间');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await batchUpdateChannelPricing({
        channel_id: formValues.channel_id,
        model_filter: formValues.model_filter,
        platform_ratio: formValues.platform_ratio,
        pricing_mode: formValues.pricing_mode,
        dry_run: true,
      });
      if (res.success) {
        setPreviewResult(res.data);
        if (res.data.blocked) {
          Toast.warning('存在价格倒挂风险，请检查');
        } else {
          Toast.info('预览完成');
        }
      } else {
        Toast.error(res.message || '预览失败');
      }
    } catch (error) {
      Toast.error('预览失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!previewResult || previewResult.blocked) {
      Toast.error('无法执行，存在价格倒挂');
      return;
    }

    setLoading(true);
    try {
      const res = await batchUpdateChannelPricing({
        channel_id: formValues.channel_id,
        model_filter: formValues.model_filter,
        platform_ratio: formValues.platform_ratio,
        pricing_mode: formValues.pricing_mode,
        dry_run: false,
      });
      if (res.success) {
        Toast.success('批量更新成功');
        if (onBatchUpdate) {
          onBatchUpdate(res.data);
        }
        onClose();
      } else {
        Toast.error(res.message || '更新失败');
      }
    } catch (error) {
      Toast.error('更新失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormValues({
      channel_id: '',
      model_filter: 'all',
      platform_ratio: 1.0,
      pricing_mode: 1,
      dry_run: true,
    });
    setPreviewResult(null);
    onClose();
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '-';
    return `$${parseFloat(price).toFixed(4)}`;
  };

  const formatPriceShort = (price) => {
    if (price === undefined || price === null) return '-';
    if (price < 0.01) return `$${price.toFixed(4)}`;
    if (price < 1) return `$${price.toFixed(3)}`;
    return `$${price.toFixed(2)}`;
  };

  const showTierTooltip = (input, output, cache) => {
    if (!output && !cache) return false;
    return output !== undefined || cache !== undefined;
  };

  const columns = [
    {
      title: '模型',
      dataIndex: 'model_name',
      width: 150,
    },
    {
      title: '原厂价(in)',
      dataIndex: 'upstream_price',
      width: 90,
      render: formatPrice,
    },
    {
      title: '渠道成本(in)',
      dataIndex: 'cost_price',
      width: 90,
      render: formatPrice,
    },
    {
      title: '原售价(in)',
      dataIndex: 'old_platform_price',
      width: 90,
      render: formatPrice,
    },
    {
      title: '新售价(in)',
      dataIndex: 'new_platform_price',
      width: 90,
      render: formatPrice,
    },
    {
      title: '利润率',
      dataIndex: 'profit_margin',
      width: 80,
      render: (value) => {
        const color = value < 0 ? '#ff4d4f' : '#52c41a';
        return (
          <span style={{ color, fontWeight: value < 0 ? 'bold' : 'normal' }}>
            {value?.toFixed(1)}%
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value) => {
        const colorMap = {
          updated: 'blue',
          unchanged: 'grey',
          blocked: 'red',
        };
        return (
          <span style={{ textTransform: 'capitalize' }}>
            {value}
          </span>
        );
      },
    },
  ];

  return (
    <Modal
      title="按渠道批量设置折扣"
      visible={visible}
      onCancel={handleClose}
      width={800}
      footer={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button onClick={handlePreview} loading={loading}>
            预览
          </Button>
          <Button
            type="primary"
            onClick={handleExecute}
            disabled={!previewResult || previewResult.blocked}
            loading={loading}
          >
            批量应用
          </Button>
        </Space>
      }
    >
      <Form
        layout="horizontal"
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Form.Select
            field="channel_id"
            label="目标渠道"
            value={formValues.channel_id}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, channel_id: value }))
            }
            style={{ width: 200 }}
            placeholder="选择渠道"
          >
            {channels.map((channel) => (
              <Form.Select.Option key={channel.id} value={channel.id}>
                {channel.name}
              </Form.Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="model_filter"
            label="模型范围"
            value={formValues.model_filter}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, model_filter: value }))
            }
            style={{ width: 200 }}
          >
            <Form.Select.Option value="all">全部模型</Form.Select.Option>
            <Form.Select.Option value="gpt">GPT 系列</Form.Select.Option>
            <Form.Select.Option value="claude">Claude 系列</Form.Select.Option>
            <Form.Select.Option value="qwen">通义千问系列</Form.Select.Option>
          </Form.Select>

          <Form.InputNumber
            field="platform_ratio"
            label={formValues.pricing_mode === 2 ? '利润率(%)' : '平台折扣'}
            value={formValues.platform_ratio}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, platform_ratio: value }))
            }
            min={formValues.pricing_mode === 2 ? 0.1 : 0.01}
            max={formValues.pricing_mode === 2 ? 500 : 3}
            step={formValues.pricing_mode === 2 ? 1 : 0.05}
            precision={formValues.pricing_mode === 2 ? 1 : 2}
            style={{ width: 130 }}
            formatter={(value) => `${value}`}
            parser={(value) => parseFloat(value) || 1.0}
          />

          <Form.Select
            field="pricing_mode"
            label="定价模式"
            value={formValues.pricing_mode}
            onChange={(value) => {
              const newRatio = value === 2 ? 50 : 1.0;
              setFormValues((prev) => ({ ...prev, pricing_mode: value, platform_ratio: newRatio }));
            }}
            style={{ width: 140 }}
          >
            <Form.Select.Option value={1}>折扣率模式</Form.Select.Option>
            <Form.Select.Option value={2}>利润率模式</Form.Select.Option>
          </Form.Select>
        </div>
      </Form>

      {selectedChannelCost && (
        <Banner
          type="info"
          style={{ marginBottom: 16 }}
          closeIcon={null}
        >
          <Space>
            <Text>渠道成本折扣: </Text>
            <Text strong style={{ color: '#1890ff' }}>
              {selectedChannelCost.cost_ratio < 1
                ? `${(selectedChannelCost.cost_ratio * 10).toFixed(1)}折`
                : '原价'}
            </Text>
            <Text type="tertiary">|</Text>
            {formValues.pricing_mode === 2 ? (
              <Text type="tertiary">
                示例: 成本价 $1.00 × (1 + 利润率) = 售价
              </Text>
            ) : (
              <Text type="tertiary">
                示例: 原厂价 $1.00 → 成本价{' '}
                ${(1.0 * selectedChannelCost.cost_ratio).toFixed(4)}
              </Text>
            )}
          </Space>
        </Banner>
      )}

      {formValues.pricing_mode === 2 ? (
        <Banner type="info" style={{ marginBottom: 16 }} closeIcon={null}>
          <Text>
            利润率模式下，系统将按 <strong>成本价 × (1 + 利润率%)</strong> 计算售价，自动校验防止价格倒挂
          </Text>
        </Banner>
      ) : (
        <Banner type="warning" style={{ marginBottom: 16 }} closeIcon={null}>
          <Text>
            <strong>注意:</strong> 系统将按所选渠道成本价自动校验，售价低于渠道成本将自动拒绝保存
          </Text>
        </Banner>
      )}

      {previewResult && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Text strong>预览结果:</Text>
              <Text>影响模型数: {previewResult.affected_models}</Text>
              <Text type="tertiary">|</Text>
              <Text>总变更: {previewResult.price_changes?.length || 0}</Text>
            </Space>
          </div>

          {previewResult.warnings?.length > 0 && (
            <Banner
              type="warning"
              style={{ marginBottom: 12 }}
              onClose={() => {}}
            >
              <Text strong>警告:</Text>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                {previewResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Banner>
          )}

          {previewResult.blocked && (
            <Banner
              type="danger"
              style={{ marginBottom: 12 }}
              closeIcon={null}
            >
              <Text strong>批量操作被阻止</Text>
              <Text> 存在价格倒挂风险，无法执行更新</Text>
            </Banner>
          )}

          <Table
            size="small"
            dataSource={previewResult.price_changes || []}
            columns={columns}
            pagination={{
              pageSize: 10,
              size: 'small',
            }}
            rowKey="model_name"
            scroll={{ y: 300 }}
          />
        </div>
      )}
    </Modal>
  );
};

export default BatchPricingModal;
