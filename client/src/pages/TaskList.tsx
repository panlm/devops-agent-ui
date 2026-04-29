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
      title: '标题 / 描述',
      key: 'title',
      ellipsis: true,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
          {record.description && (
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 80,
      render: (v: string) => taskTypeMap[v] || v,
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
      title: '耗时',
      key: 'duration',
      width: 90,
      render: (_: any, record: any) => {
        if (record.status === 'PENDING_START' || record.status === 'PENDING_TRIAGE') {
          return '-';
        }
        if (record.status === 'IN_PROGRESS') {
          const sec = dayjs().diff(dayjs(record.createdAt), 'second');
          if (sec < 60) return `${sec}秒`;
          return `${Math.floor(sec / 60)}分钟`;
        }
        const sec = dayjs(record.updatedAt).diff(dayjs(record.createdAt), 'second');
        if (sec < 60) return `${sec}秒`;
        if (sec < 3600) return `${Math.floor(sec / 60)}分钟`;
        return `${Math.floor(sec / 60 / 60)}小时${Math.floor((sec % 3600) / 60)}分`;
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
