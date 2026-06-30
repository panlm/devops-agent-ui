import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Space, Alert, Empty, Tag, Table, Spin } from 'antd';
import { ScheduleOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { listGoals } from '../api/client';

const { Title, Text, Paragraph } = Typography;

const goalStatusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '活跃', color: 'processing' },
  PAUSED: { label: '已暂停', color: 'warning' },
  COMPLETE: { label: '已完成', color: 'success' },
};

const goalTypeMap: Record<string, string> = {
  CUSTOMER_DEFINED: '自定义目标',
  ONCALL_REPORT: '值班报告',
};

export default function Artifacts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['goals'],
    queryFn: () => listGoals() as Promise<any>,
  });

  const goals = data?.goals || [];

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'goalType',
      key: 'goalType',
      width: 120,
      render: (v: string) => (
        <Space size={4}>
          {v === 'ONCALL_REPORT' ? <ScheduleOutlined /> : <FileTextOutlined />}
          <span>{goalTypeMap[v] || v}</span>
        </Space>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 70,
      render: (v: number) => v ? `v${v}` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const s = goalStatusMap[v] || { label: v, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '调度',
      key: 'schedule',
      width: 160,
      render: (_: any, record: any) => {
        const sched = record.evaluationSchedule;
        if (!sched) return '-';
        return (
          <Space size={4}>
            <Tag color={sched.state === 'ENABLED' ? 'green' : 'default'}>
              {sched.state === 'ENABLED' ? '已启用' : '已禁用'}
            </Tag>
            {sched.expression && <Text type="secondary" style={{ fontSize: 11 }}>{sched.expression}</Text>}
          </Space>
        );
      },
    },
    {
      title: '上次评估',
      dataIndex: 'lastEvaluatedAt',
      key: 'lastEvaluatedAt',
      width: 150,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      defaultSortOrder: 'descend' as const,
      sorter: (a: any, b: any) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={3}>制品</Title>
      <Text type="secondary">
        制品包括 DevOps Agent 生成的结构化文档(运维报告、健康评估等)和目标评估结果。对话中生成的制品可在运维对话页查看。
      </Text>

      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          showIcon
        />
      )}

      <Card title="目标与定期报告" size="small">
        {isLoading ? (
          <Spin tip="加载中..." />
        ) : goals.length === 0 ? (
          <Empty description="暂无目标。在 DevOps Agent 控制台中创建目标后将在此展示。" />
        ) : (
          <Table
            dataSource={goals}
            columns={columns}
            rowKey="goalId"
            pagination={false}
            size="small"
            expandable={{
              expandedRowRender: (record: any) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {record.content?.description && (
                    <div>
                      <Text type="secondary" strong>描述:</Text>
                      <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                        {record.content.description}
                      </Paragraph>
                    </div>
                  )}
                  {record.content?.objectives && (
                    <div>
                      <Text type="secondary" strong>目标:</Text>
                      <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                        {record.content.objectives}
                      </Paragraph>
                    </div>
                  )}
                </Space>
              ),
            }}
          />
        )}
      </Card>
    </Space>
  );
}
