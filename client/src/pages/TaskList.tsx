import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Typography, Card, Space, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listTasks } from '../api/client';
import { getStatus, getPriority, taskTypeMap } from '../utils/status';

const { Title } = Typography;

export default function TaskList() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks() as Promise<any>,
  });

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: '35%',
    },
    {
      title: '类型',
      dataIndex: 'taskType',
      key: 'taskType',
      width: '8%',
      render: (v: string) => taskTypeMap[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (v: string) => {
        const s = getStatus(v);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: '10%',
      render: (v: string) => {
        const p = getPriority(v);
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      defaultSortOrder: 'descend' as const,
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '18%',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={3}>调查列表</Title>
      {error && (
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message}
          showIcon
        />
      )}
      <Card>
        <Table
          dataSource={data?.tasks || []}
          columns={columns}
          rowKey="taskId"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({
            onClick: () => navigate(`/tasks/${record.taskId}`),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: '暂无调查记录' }}
        />
      </Card>
    </Space>
  );
}
