import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Tag,
  Typography,
  Collapse,
  Space,
  Button,
  Alert,
  Spin,
  Empty,
} from 'antd';
import { ArrowLeftOutlined, BugOutlined, FileSearchOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getInvestigation, listInvestigationExecutions, getExecutionJournal } from '../api/client';
import { getStatus, getPriority, taskTypeMap } from '../utils/status';

marked.setOptions({ breaks: true, gfm: true });

const { Title, Text } = Typography;

function Md({ children }: { children: string }) {
  const raw = marked.parse(children || '') as string;
  const html = DOMPurify.sanitize(raw);
  return (
    <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function JournalView({ executionId }: { executionId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['journal', executionId],
    queryFn: () => getExecutionJournal(executionId) as Promise<any>,
  });

  if (isLoading) return <Spin tip="加载调查记录..." />;
  if (error) return <Alert type="error" message="加载记录失败" description={(error as Error).message} />;

  const records = data?.records || [];
  if (records.length === 0) return <Empty description="暂无记录" />;

  const collapseItems = records.map((record: any) => {
    let parsed: any;
    try {
      parsed = JSON.parse(record.content);
    } catch {
      parsed = { text: record.content };
    }

    // Build label and detail content per record type
    let label: React.ReactNode;
    let detail: React.ReactNode;
    let borderColor: string;

    if (record.recordType === 'finding') {
      borderColor = '#cf1322';
      label = (
        <span>
          <BugOutlined style={{ color: '#cf1322', marginRight: 8 }} />
          <Text strong style={{ color: '#cf1322' }}>发现: {parsed.title}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </span>
      );
      detail = (
        <>
          <Md>{parsed.description}</Md>
          {parsed.related_resources && parsed.related_resources.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">相关资源:</Text>
              {parsed.related_resources.map((r: string, i: number) => (
                <div key={i}>
                  <Text code style={{ fontSize: 12 }}>{r}</Text>
                </div>
              ))}
            </div>
          )}
        </>
      );
    } else if (record.recordType === 'investigation_summary') {
      borderColor = '#1677ff';
      label = (
        <span>
          <FileSearchOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          <Text strong style={{ color: '#1677ff' }}>调查总结</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </span>
      );
      detail = (
        <>
          {parsed.symptoms && parsed.symptoms.length > 0 && (
            <div>
              <Text type="secondary" strong>症状:</Text>
              {parsed.symptoms.map((s: any, i: number) => (
                <div key={i} style={{ marginTop: 4 }}>
                  <Text strong>{s.title}</Text>
                  <Md>{s.description}</Md>
                </div>
              ))}
            </div>
          )}
          {parsed.findings && parsed.findings.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" strong>根因:</Text>
              {parsed.findings.map((f: any, i: number) => (
                <div key={i} style={{ marginTop: 4 }}>
                  <Text strong>{f.title}</Text>
                  {f.description && <Md>{f.description}</Md>}
                </div>
              ))}
            </div>
          )}
        </>
      );
    } else if (record.recordType === 'message') {
      const role = parsed.role || 'system';
      const texts: string[] = [];
      if (parsed.content && Array.isArray(parsed.content)) {
        for (const c of parsed.content) {
          if (c.type === 'text' && c.text) texts.push(c.text);
        }
      } else if (typeof parsed.text === 'string') {
        texts.push(parsed.text);
      }
      if (texts.length === 0) return null;
      const preview = texts[0].length > 80 ? texts[0].slice(0, 80) + '...' : texts[0];
      const isUser = role === 'user' || role === 'human';
      const roleColor = isUser ? '#52c41a' : '#1677ff';
      const roleLabel = isUser ? 'User' : 'Agent';
      borderColor = isUser ? '#52c41a' : '#1677ff';
      label = (
        <span>
          <MessageOutlined style={{ color: roleColor, marginRight: 8 }} />
          <Tag color={roleColor}>{roleLabel}</Tag>
          <Text ellipsis style={{ maxWidth: 500, display: 'inline' }}>{preview}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </span>
      );
      detail = texts.map((t, i) => (
        <Md key={i}>{t}</Md>
      ));
    } else {
      borderColor = '#d9d9d9';
      label = (
        <span>
          <Tag>{record.recordType}</Tag>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </span>
      );
      detail = (
        <Md>{typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}</Md>
      );
    }

    return {
      key: record.recordId,
      label,
      children: detail,
      style: { borderLeft: `3px solid ${borderColor}`, marginBottom: 8 },
    };
  }).filter(Boolean);

  return (
    <Collapse
      items={collapseItems}
      bordered={false}
      size="small"
      defaultActiveKey={[]}
    />
  );
}

function ExecutionView({ taskId }: { taskId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['executions', taskId],
    queryFn: () => listInvestigationExecutions(taskId) as Promise<any>,
  });

  if (isLoading) return <Spin tip="加载执行记录..." />;
  if (error) return <Alert type="error" message="加载执行记录失败" />;

  const executions = data?.executions || [];
  if (executions.length === 0) return <Empty description="暂无执行记录" />;

  const toItem = (e: any, showType = false) => {
    const s = getStatus(e.executionStatus);
    return {
      key: e.executionId,
      label: (
        <span>
          {showType ? `${e.agentSubTask || e.agentType} — ` : '执行 '}
          {dayjs(e.createdAt).format('YYYY-MM-DD HH:mm')} —{' '}
          <Tag color={s.color}>{s.label}</Tag>
        </span>
      ),
      children: <JournalView executionId={e.executionId} />,
    };
  };

  const filtered = executions.filter((e: any) => e.agentSubTask === 'oncall' || e.agentType === 'ops1');
  const items = filtered.length > 0
    ? filtered.map((e: any) => toItem(e))
    : executions.map((e: any) => toItem(e, true));

  return <Collapse items={items} defaultActiveKey={[items[0]?.key]} />;
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['investigation', taskId],
    queryFn: () => getInvestigation(taskId!) as Promise<any>,
    enabled: !!taskId,
  });

  if (isLoading) return <Spin tip="加载调查详情..." size="large" style={{ display: 'block', marginTop: 100 }} />;
  if (error) return <Alert type="error" message="加载失败" description={(error as Error).message} showIcon />;

  const task = data?.task;
  if (!task) return <Empty description="未找到此调查" />;

  const status = getStatus(task.status);
  const priority = getPriority(task.priority);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
        返回列表
      </Button>
      <Title level={3}>{task.title}</Title>
      <Card>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="状态">
            <Tag color={status.color}>{status.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={priority.color}>{priority.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="类型">{taskTypeMap[task.taskType] || task.taskType}</Descriptions.Item>
          <Descriptions.Item label="任务 ID">
            <Text copyable style={{ fontSize: 12 }}>{task.taskId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(task.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          {task.description && (
            <Descriptions.Item label="描述" span={2}>
              <Md>{task.description}</Md>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Title level={4}>调查时间线</Title>
      <ExecutionView taskId={taskId!} />
    </Space>
  );
}
