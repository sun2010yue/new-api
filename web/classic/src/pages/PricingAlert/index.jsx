import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Tag,
  Typography,
  Card,
  Space,
  Badge,
  Toast,
  Tooltip,
} from '@douyinfe/semi-ui';
import { IconBell, IconCheckCircleStroked } from '@douyinfe/semi-icons';
import {
  getPriceAlertLogs,
  getUnreadPriceAlertCount,
  acknowledgePriceAlert,
  acknowledgeAllPriceAlerts,
} from '../../services/channelCostService';

const { Text, Title } = Typography;

const PricingAlertPage = () => {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const pageSize = 20;

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        getPriceAlertLogs({ page, page_size: pageSize }),
        getUnreadPriceAlertCount(),
      ]);
      if (listRes.success) {
        setAlerts(listRes.data?.items || []);
        setTotal(listRes.data?.total || 0);
      }
      if (countRes.success) {
        setUnreadCount(countRes.data?.count || 0);
      }
    } catch (error) {
      Toast.error('加载告警数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleAcknowledge = async (id) => {
    try {
      const res = await acknowledgePriceAlert(id);
      if (res.success) {
        Toast.success('已确认');
        loadAlerts();
      } else {
        Toast.error(res.message || '操作失败');
      }
    } catch (error) {
      Toast.error('操作失败: ' + error.message);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      const res = await acknowledgeAllPriceAlerts();
      if (res.success) {
        Toast.success('已全部确认');
        loadAlerts();
      } else {
        Toast.error(res.message || '操作失败');
      }
    } catch (error) {
      Toast.error('操作失败: ' + error.message);
    }
  };

  const alertTypeConfig = {
    price_inversion: { color: 'red', text: '价格倒挂' },
    profit_margin_low: { color: 'orange', text: '利润率过低' },
    model_disabled: { color: 'grey', text: '模型禁用' },
  };

  const statusConfig = {
    0: { color: 'red', text: '未读' },
    1: { color: 'blue', text: '已读' },
    2: { color: 'green', text: '已确认' },
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'alert_type',
      width: 100,
      render: (value) => {
        const cfg = alertTypeConfig[value] || { color: 'blue', text: value };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '渠道',
      dataIndex: 'channel_name',
      width: 140,
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      width: 160,
    },
    {
      title: '成本价',
      dataIndex: 'cost_price',
      width: 100,
      render: (v) => (v !== undefined ? `$${v.toFixed(4)}` : '-'),
    },
    {
      title: '售价',
      dataIndex: 'platform_price',
      width: 100,
      render: (v) => (v !== undefined ? `$${v.toFixed(4)}` : '-'),
    },
    {
      title: '利润率',
      dataIndex: 'profit_margin',
      width: 90,
      render: (v) => {
        const color = v < 0 ? '#ff4d4f' : '#fa8c16';
        return <span style={{ color }}>{v?.toFixed(1)}%</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (value) => {
        const cfg = statusConfig[value] || { color: 'blue', text: value };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      width: 300,
      render: (text) => (
        <Tooltip content={text}>
          <Text ellipsis={{ showTooltip: false }} style={{ maxWidth: 280 }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '时间',
      dataIndex: 'created_time',
      width: 160,
      render: formatTimestamp,
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        record.status !== 2 ? (
          <Button
            size="small"
            icon={<IconCheckCircleStroked />}
            onClick={() => handleAcknowledge(record.id)}
          >
            确认
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3}>价格告警</Title>
        <Text type="tertiary">监控价格倒挂、利润率过低等异常情况</Text>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Badge count={unreadCount} type="danger">
            <Text strong>未处理告警: {unreadCount}</Text>
          </Badge>
          <Button
            icon={<IconCheckCircleStroked />}
            onClick={handleAcknowledgeAll}
            disabled={unreadCount === 0}
          >
            全部确认
          </Button>
          <Button icon={<IconBell />} onClick={loadAlerts} loading={loading}>
            刷新
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={alerts}
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 1400 }}
        rowKey="id"
      />
    </div>
  );
};

export default PricingAlertPage;
