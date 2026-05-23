import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Toast,
  Typography,
  Card,
  Space,
  Tag,
  Tooltip,
  Empty,
} from '@douyinfe/semi-ui';
import {
  IconRefresh,
  IconEdit2,
  IconSearch,
} from '@douyinfe/semi-icons';
import {
  getChannelModelPrices,
  syncChannelPrices,
  batchUpdateChannelPricing,
  checkPriceAnomalies,
  getChannelCosts,
} from '../../services/channelCostService';
import { getChannels } from '../../helpers/api';
import BatchPricingModal from '../../components/table/model-pricing/components/BatchPricingModal';

const { Text, Title } = Typography;

const MultiChannelPricingPage = () => {
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelCosts, setChannelCosts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [filterChannel, setFilterChannel] = useState(null);
  const [filterModel, setFilterModel] = useState('');
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pricesRes, channelsRes, costsRes, anomaliesRes] = await Promise.all([
        getChannelModelPrices({ channel_id: filterChannel || undefined }),
        getChannels(),
        getChannelCosts(),
        checkPriceAnomalies(),
      ]);

      if (pricesRes.success) {
        let items = pricesRes.data?.items || [];
        if (filterModel) {
          items = items.filter((p) =>
            p.model_name.toLowerCase().includes(filterModel.toLowerCase())
          );
        }
        setPrices(items);
      }

      if (channelsRes.success) {
        setChannels(channelsRes.data?.items || channelsRes.data || []);
      }

      if (costsRes.success) {
        setChannelCosts(costsRes.data || []);
      }

      if (anomaliesRes.success) {
        setAnomalies(anomaliesRes.data?.items || []);
      }
    } catch (error) {
      Toast.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterModel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncPrices = async (channelId, dryRun = true) => {
    try {
      const res = await syncChannelPrices({ channel_id: channelId, dry_run: dryRun });
      if (res.success) {
        if (dryRun) {
          Toast.info('同步预览完成，请查看变更');
        } else {
          Toast.success('同步完成');
          loadData();
        }
        return res.data;
      } else {
        Toast.error(res.message || '同步失败');
      }
    } catch (error) {
      Toast.error('同步失败: ' + error.message);
    }
    return null;
  };

  const handleBatchUpdate = async (data) => {
    try {
      const res = await batchUpdateChannelPricing(data);
      if (res.success) {
        Toast.success('批量更新成功');
        setBatchModalVisible(false);
        loadData();
        return res.data;
      } else {
        Toast.error(res.message || '批量更新失败');
      }
    } catch (error) {
      Toast.error('批量更新失败: ' + (error.response?.data?.message || error.message));
    }
    return null;
  };

  const getChannelCostRatio = (channelId) => {
    const cost = channelCosts.find((c) => c.channel_id === channelId);
    return cost ? cost.cost_ratio : 1.0;
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '-';
    return `$${parseFloat(price).toFixed(4)}`;
  };

  const formatPriceShort = (price) => {
    if (price === undefined || price === null) return '-';
    if (price === 0) return '$0';
    if (price < 0.01) return `$${price.toFixed(4)}`;
    if (price < 1) return `$${price.toFixed(3)}`;
    return `$${price.toFixed(2)}`;
  };

  const renderPriceTiers = (input, output, cache) => (
    <Tooltip
      content={
        <div style={{ lineHeight: 2 }}>
          <div>输入: {formatPrice(input)}</div>
          <div>输出: {formatPrice(output)}</div>
          <div>缓存: {formatPrice(cache)}</div>
        </div>
      }
    >
      <div style={{ cursor: 'help' }}>
        <div>{formatPriceShort(input)}</div>
        {(output !== undefined && output !== null && output !== input) && (
          <Text type="tertiary" size="small" style={{ fontSize: 11 }}>
            out: {formatPriceShort(output)}
          </Text>
        )}
      </div>
    </Tooltip>
  );

  const getProfitMarginColor = (margin) => {
    if (margin < 0) return '#ff4d4f';
    if (margin < 20) return '#fa8c16';
    return '#52c41a';
  };

  const columns = [
    {
      title: '模型名称',
      dataIndex: 'model_name',
      width: 180,
      fixed: 'left',
      render: (text) => (
        <Text strong>{text}</Text>
      ),
    },
    {
      title: '渠道',
      width: 150,
      render: (_, record) => (
        <Space vertical align="start">
          <Text>{record.channel_name || `渠道 ${record.channel_id}`}</Text>
          <Tag size="small" style={{ background: '#f0f5ff', border: 'none' }}>
            {(record.cost_ratio || 1) < 1
              ? `${((record.cost_ratio || 1) * 10).toFixed(1)}折`
              : '原价'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '原厂价(输入/输出/缓存)',
      width: 130,
      render: (_, record) => renderPriceTiers(
        record.upstream_price,
        record.upstream_output_price,
        record.upstream_cache_price,
      ),
    },
    {
      title: '渠道成本',
      dataIndex: 'cost_price',
      width: 130,
      render: (_, record) => renderPriceTiers(
        record.cost_price,
        record.cost_output_price,
        record.cost_cache_price,
      ),
    },
    {
      title: '定价模式',
      dataIndex: 'pricing_mode',
      width: 90,
      render: (value) => (
        <Tag color={value === 2 ? 'blue' : 'grey'}>
          {value === 2 ? '利润率' : '折扣率'}
        </Tag>
      ),
    },
    {
      title: '折扣/利润率',
      dataIndex: 'platform_ratio',
      width: 110,
      render: (value, record) => {
        if (!value) return '1.00';
        return record.pricing_mode === 2
          ? `${value.toFixed(1)}%`
          : value.toFixed(2);
      },
    },
    {
      title: '平台售价(输入/输出/缓存)',
      width: 130,
      render: (_, record) => {
        const input = record.platform_price;
        const output = record.platform_output_price;
        const cache = record.platform_cache_price;
        return (
          <Tooltip
            content={
              <div style={{ lineHeight: 2 }}>
                <div>输入: {formatPrice(input)}</div>
                <div>输出: {formatPrice(output)}</div>
                <div>缓存: {formatPrice(cache)}</div>
              </div>
            }
          >
            <span style={{ cursor: 'help', color: '#1890ff', fontWeight: 600 }}>
              {formatPriceShort(input)}
              {(output !== undefined && output !== null && output !== input) && (
                <Text size="small" style={{ color: '#69b1ff', fontSize: 11, display: 'block' }}>
                  out: {formatPriceShort(output)}
                </Text>
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '利润率',
      dataIndex: 'profit_margin',
      width: 100,
      render: (value) => {
        const color = getProfitMarginColor(value);
        const isLoss = value < 0;
        return (
          <Tag color={isLoss ? 'red' : 'green'} style={{ background: `${color}20` }}>
            {value?.toFixed(1) || '0'}%
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value) => (
        <Tag color={value === 1 ? 'green' : 'grey'}>
          {value === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<IconRefresh />}
            onClick={() => {
              setSelectedChannel(record.channel_id);
              setSyncModalVisible(true);
            }}
          >
            同步
          </Button>
          <Button
            type="primary"
            size="small"
            theme="borderless"
            icon={<IconEdit2 />}
            onClick={() => {
              setSelectedChannel(record.channel_id);
              setBatchModalVisible(true);
            }}
          >
            批量调价
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3}>多渠道定价管理</Title>
        <Text type="tertiary">
          统一管理不同渠道的模型价格，支持批量调价和同步
        </Text>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Select
            placeholder="筛选渠道"
            value={filterChannel}
            onChange={(value) => setFilterChannel(value)}
            allowClear
            style={{ width: 200 }}
          >
            {channels.map((channel) => (
              <Select.Option key={channel.id} value={channel.id}>
                {channel.name}
              </Select.Option>
            ))}
          </Select>

          <div style={{ position: 'relative' }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索模型名称"
              value={filterModel}
              onChange={(value) => setFilterModel(value)}
              style={{ width: 200 }}
            />
          </div>

          <Button
            icon={<IconRefresh />}
            onClick={loadData}
            loading={loading}
          >
            刷新
          </Button>

          <Button
            type="primary"
            onClick={() => {
              setSelectedChannel(null);
              setBatchModalVisible(true);
            }}
          >
            批量定价
          </Button>
        </Space>
      </Card>

      {anomalies.length > 0 && (
        <Card
          style={{
            marginBottom: 24,
            background: '#fff2f0',
            border: '1px solid #ffccc7',
          }}
        >
          <Title heading={6} style={{ color: '#cf1322', marginBottom: 12 }}>
            ⚠️ 价格异常提醒
          </Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {anomalies.slice(0, 5).map((anomaly, index) => (
              <Tag key={index} color="red">
                {anomaly.channel_name} - {anomaly.model_name}:{' '}
                {anomaly.profit_margin?.toFixed(1)}%
              </Tag>
            ))}
            {anomalies.length > 5 && (
              <Tag>+{anomalies.length - 5} 更多</Tag>
            )}
          </div>
        </Card>
      )}

      {prices.length > 0 ? (
        <Table
          columns={columns}
          dataSource={prices}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
          rowKey="id"
        />
      ) : (
        !loading && (
          <Card>
            <Empty
              description="暂无定价数据"
              style={{ marginBottom: 16 }}
            />
            <div style={{ background: '#f6f9ff', padding: 16, borderRadius: 8 }}>
              <Title heading={6} style={{ marginBottom: 12 }}>开始设置定价</Title>
              <Text type="tertiary" style={{ display: 'block', marginBottom: 8 }}>
                定价数据需要通过以下步骤生成：
              </Text>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li><Text>在 <strong>渠道成本</strong> 页面为渠道设置成本折扣（若未设置，默认按原价计算）</Text></li>
                <li><Text>点击上方 <strong>批量定价</strong> 按钮，选择渠道和定价模式，批量生成定价记录</Text></li>
                <li><Text>或选择一个渠道，点击 <strong>同步</strong> 从上游拉取官方价格</Text></li>
              </ol>
              <Space style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  onClick={() => {
                    setSelectedChannel(null);
                    setBatchModalVisible(true);
                  }}
                >
                  批量定价
                </Button>
                {channels.length > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedChannel(channels[0].id);
                      setSyncModalVisible(true);
                    }}
                  >
                    同步首个渠道
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )
      )}

      <BatchPricingModal
        visible={batchModalVisible}
        channels={channels}
        channelCosts={channelCosts}
        defaultChannelId={selectedChannel}
        onClose={() => {
          setBatchModalVisible(false);
          setSelectedChannel(null);
        }}
        onBatchUpdate={handleBatchUpdate}
      />

      <Modal
        title="同步渠道价格"
        visible={syncModalVisible}
        onCancel={() => {
          setSyncModalVisible(false);
          setSelectedChannel(null);
        }}
        footer={null}
        width={600}
      >
        <SyncPricePanel
          channelId={selectedChannel}
          channelName={channels.find((c) => c.id === selectedChannel)?.name}
          onSync={handleSyncPrices}
          onClose={() => {
            setSyncModalVisible(false);
            setSelectedChannel(null);
          }}
        />
      </Modal>
    </div>
  );
};

const SyncPricePanel = ({ channelId, channelName, onSync, onClose }) => {
  const [previewResult, setPreviewResult] = useState(null);
  const [executing, setExecuting] = useState(false);

  const handlePreview = async () => {
    setExecuting(true);
    const result = await onSync(channelId, true);
    if (result) {
      setPreviewResult(result);
    }
    setExecuting(false);
  };

  const handleExecute = async () => {
    setExecuting(true);
    await onSync(channelId, false);
    setExecuting(false);
    onClose();
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text>渠道: <strong>{channelName || `渠道 ${channelId}`}</strong></Text>
        <br />
        <Text type="tertiary" size="small">
          同步将从上游拉取最新价格并更新到本地记录
        </Text>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Button
          onClick={handlePreview}
          loading={executing}
        >
          预览变更
        </Button>
        <Button
          type="primary"
          onClick={handleExecute}
          disabled={!previewResult}
          loading={executing}
        >
          确认同步
        </Button>
      </Space>

      {previewResult && (
        <div>
          <Text strong>变更预览:</Text>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>影响模型数: {previewResult.affected_count}</li>
            <li>总模型数: {previewResult.price_changes?.length || 0}</li>
          </ul>

          {previewResult.price_changes?.length > 0 && (
            <Table
              size="small"
              dataSource={previewResult.price_changes.slice(0, 10)}
              pagination={false}
              columns={[
                {
                  title: '模型',
                  dataIndex: 'model_name',
                  width: 150,
                },
                {
                  title: '原厂价',
                  dataIndex: 'upstream_price',
                  width: 80,
                  render: (v) => `$${v?.toFixed(4)}`,
                },
                {
                  title: '原售价',
                  dataIndex: 'old_platform_price',
                  width: 80,
                  render: (v) => `$${v?.toFixed(4)}`,
                },
                {
                  title: '新售价',
                  dataIndex: 'new_platform_price',
                  width: 80,
                  render: (v) => `$${v?.toFixed(4)}`,
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 70,
                  render: (v) => (
                    <Tag size="small" color={v === 'updated' ? 'blue' : 'grey'}>
                      {v}
                    </Tag>
                  ),
                },
              ]}
            />
          )}

          {previewResult.warnings?.length > 0 && (
            <div style={{ marginTop: 16, color: '#fa8c16' }}>
              <Text strong>警告:</Text>
              <ul>
                {previewResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiChannelPricingPage;
