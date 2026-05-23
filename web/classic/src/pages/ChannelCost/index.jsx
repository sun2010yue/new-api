import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  Toast,
  Typography,
  Card,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Empty,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconEdit2,
  IconRefresh,
} from '@douyinfe/semi-icons';
import {
  getChannelCosts,
  createChannelCost,
  updateChannelCost,
  deleteChannelCost,
  getPricingStats,
} from '../../services/channelCostService';
import { getChannels } from '../../helpers/api';

const { Text, Title } = Typography;

const ChannelCostPage = () => {
  const [loading, setLoading] = useState(false);
  const [channelCosts, setChannelCosts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [stats, setStats] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [formValues, setFormValues] = useState({
    channel_id: '',
    cost_ratio: 1.0,
    cost_description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [costsRes, channelsRes, statsRes] = await Promise.all([
        getChannelCosts(),
        getChannels(),
        getPricingStats(),
      ]);
      if (costsRes.success) {
        setChannelCosts(costsRes.data || []);
      }
      if (channelsRes.success) {
        setChannels(channelsRes.data?.items || channelsRes.data || []);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      Toast.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (cost = null) => {
    if (cost) {
      setEditingCost(cost);
      setFormValues({
        channel_id: cost.channel_id,
        cost_ratio: cost.cost_ratio,
        cost_description: cost.cost_description || '',
      });
    } else {
      setEditingCost(null);
      setFormValues({
        channel_id: '',
        cost_ratio: 1.0,
        cost_description: '',
      });
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingCost(null);
  };

  const handleSubmit = async () => {
    if (!formValues.channel_id) {
      Toast.error('请选择渠道');
      return;
    }
    if (formValues.cost_ratio <= 0 || formValues.cost_ratio > 2) {
      Toast.error('成本折扣必须在 0.01 - 2.0 之间');
      return;
    }

    try {
      if (editingCost) {
        await updateChannelCost(editingCost.id, formValues);
        Toast.success('更新成功');
      } else {
        await createChannelCost(formValues);
        Toast.success('创建成功');
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      Toast.error('操作失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteChannelCost(id);
      Toast.success('删除成功');
      loadData();
    } catch (error) {
      Toast.error('删除失败: ' + error.message);
    }
  };

  const getChannelName = (channelId) => {
    const channel = channels.find((c) => c.id === channelId);
    return channel ? channel.name : `渠道 ${channelId}`;
  };

  // Find channels without cost settings
  const unconfiguredChannels = channels.filter(
    (c) => !channelCosts.some((cost) => cost.channel_id === c.id)
  );

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '渠道名称',
      dataIndex: 'channel_name',
      width: 150,
      render: (text, record) => (
        <Space>
          <Text strong>{text || `渠道 ${record.channel_id}`}</Text>
          {record.channel_tag && <Tag>{record.channel_tag}</Tag>}
        </Space>
      ),
    },
    {
      title: '成本折扣',
      dataIndex: 'cost_ratio',
      width: 120,
      render: (value) => (
        <Text strong style={{ color: value < 1 ? '#fa8c16' : '#52c41a' }}>
          {value < 1 ? `${(value * 10).toFixed(1)}折` : `${(value * 100).toFixed(0)}%`}
        </Text>
      ),
    },
    {
      title: '模型数量',
      dataIndex: 'model_count',
      width: 100,
      render: (value) => <Text>{value || 0}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => (
        <Tag color={value === 1 ? 'green' : 'grey'}>
          {value === 1 ? '在线' : '离线'}
        </Tag>
      ),
    },
    {
      title: '成本说明',
      dataIndex: 'cost_description',
      width: 200,
      render: (text) => (
        <Tooltip content={text || '无说明'}>
          <Text type="tertiary">{text || '-'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            theme="borderless"
            size="small"
            icon={<IconEdit2 />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            content="确定要删除这个渠道成本设置吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="danger"
              theme="borderless"
              size="small"
              icon={<IconDelete />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Unconfigured channel columns
  const unconfiguredColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '渠道名称',
      dataIndex: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.tag && <Tag>{record.tag}</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => (
        <Tag color={value === 1 ? 'green' : 'grey'}>
          {value === 1 ? '在线' : '离线'}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<IconPlus />}
          onClick={() => handleOpenModal({ channel_id: record.id, cost_ratio: 1.0 })}
        >
          设置成本
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3}>上游渠道管理</Title>
        <Text type="tertiary">
          管理渠道上游成本折扣，设置不同渠道的采购成本价格
        </Text>
      </div>

      {stats && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', textAlign: 'center' }}>
            <div style={{ flex: 1, padding: 16 }}>
              <Title heading={4}>{stats.total_channels}</Title>
              <Text type="tertiary">总渠道数</Text>
            </div>
            <div style={{ flex: 1, padding: 16 }}>
              <Title heading={4} style={{ color: '#52c41a' }}>
                {stats.active_channels}
              </Title>
              <Text type="tertiary">活跃渠道</Text>
            </div>
            <div style={{ flex: 1, padding: 16 }}>
              <Title heading={4}>{stats.total_models}</Title>
              <Text type="tertiary">定价模型数</Text>
            </div>
            <div style={{ flex: 1, padding: 16 }}>
              <Title heading={4} style={{ color: stats.price_anomalies?.length > 0 ? '#ff4d4f' : '#52c41a' }}>
                {stats.price_anomalies?.length || 0}
              </Title>
              <Text type="tertiary">价格异常</Text>
            </div>
          </div>
        </Card>
      )}

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={() => handleOpenModal()}
          >
            新增渠道成本
          </Button>
          <Button
            icon={<IconRefresh />}
            onClick={loadData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {channelCosts.length > 0 ? (
        <Table
          columns={columns}
          dataSource={channelCosts}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          rowKey="id"
        />
      ) : (
        <Empty
          description={unconfiguredChannels.length > 0
            ? '尚未设置渠道成本，请为下方渠道设置成本折扣'
            : '暂无数据'
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {unconfiguredChannels.length > 0 && (
        <Card
          style={{ marginTop: channelCosts.length > 0 ? 24 : 0 }}
          title={
            <Space>
              <Text strong>未设置成本的渠道</Text>
              <Tag color="orange">{unconfiguredChannels.length} 个</Tag>
            </Space>
          }
        >
          <Text type="tertiary" style={{ marginBottom: 12, display: 'block' }}>
            以下渠道尚未设置成本折扣，默认按原价（1.0）计算。设置成本折扣后，定价页面才能准确计算渠道成本价。
          </Text>
          <Table
            columns={unconfiguredColumns}
            dataSource={unconfiguredChannels}
            loading={loading}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Card>
      )}

      <Modal
        title={editingCost ? '编辑渠道成本' : '新增渠道成本'}
        visible={modalVisible}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        width={500}
        okText="保存"
        cancelText="取消"
      >
        <Form
          layout="vertical"
          values={formValues}
          onValueChange={(values) => setFormValues(values)}
        >
          <Form.Select
            field="channel_id"
            label="选择渠道"
            placeholder="请选择渠道"
            disabled={!!editingCost}
            style={{ width: '100%' }}
          >
            {channels.map((channel) => (
              <Form.Select.Option key={channel.id} value={channel.id}>
                {channel.name} {channel.tag ? `(${channel.tag})` : ''}
              </Form.Select.Option>
            ))}
          </Form.Select>

          <Form.InputNumber
            field="cost_ratio"
            label="成本折扣"
            placeholder="如: 0.5 表示5折, 1.0 表示原价"
            min={0.01}
            max={2.0}
            step={0.01}
            precision={4}
            style={{ width: '100%' }}
            formatter={(value) => `${value}`}
            parser={(value) => parseFloat(value) || 1.0}
          />

          <Form.TextArea
            field="cost_description"
            label="成本说明"
            placeholder="可选，填写成本说明备注"
            rows={3}
            style={{ width: '100%' }}
          />

          <div style={{ background: '#f6f9ff', padding: 12, borderRadius: 4, marginTop: 8 }}>
            <Text type="tertiary" size="small">
              <strong>说明：</strong>
              <br />
              • 成本折扣 = 0.5 表示以官方价格的 50% 采购
              <br />
              • 成本折扣 = 1.0 表示以官方原价采购
              <br />
              • 设置成本折扣后，系统会自动计算渠道成本价
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ChannelCostPage;