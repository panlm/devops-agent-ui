import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Typography, Card, Space, Alert, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listChanges } from '../api/client';
import { getStatus, getPriority } from '../utils/status';

const { Title, Text } = Typography;

export default function Changes() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['changes'],
    queryFn: () => listChanges() as Promise<any>,
  });

  const columns = [
    {
      title: '变更建议',
      key: 'title',
      ellipsis: true,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.title}
          </div>
          {record.description && (
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const s = getStatus(v);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (v: string) => {
        const p = getPriority(v);
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      defaultSortOrder: 'descend' as const,
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const tasks = data?.tasks || [];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>变更</Title>
        <Tag color="blue">Preview</Tag>
      </div>
      <Text type="secondary">
        DevOps Agent 可评估代码变更的生产风险,包括依赖项风险、与标准的偏差和访问控制变动等。通过对话让 Agent 评审仓库分支来生成变更记录。
      </Text>
      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          showIcon
        />
      )}
      <Card>
        {!isLoading && tasks.length === 0 ? (
          <Empty description="暂无变更记录。通过运维对话让 Agent 评审代码分支即可生成变更。" />
        ) : (
          <Table
            dataSource={tasks}
            columns={columns}
            rowKey="taskId"
            loading={isLoading}
            pagination={{ pageSize: 20 }}
            onRow={(record) => ({
              onClick: () => navigate(`/tasks/${record.taskId}`),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: '暂无变更记录' }}
          />
        )}
      </Card>
    </Space>
  );
}
