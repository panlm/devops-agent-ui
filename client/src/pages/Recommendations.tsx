import { useQuery } from '@tanstack/react-query';
import { Card, List, Tag, Typography, Space, Alert, Empty, Collapse, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listRecommendations } from '../api/client';
import { getStatus, getPriority } from '../utils/status';

const { Title, Text, Paragraph } = Typography;

function RecommendationContent({ content }: { content: any }) {
  if (!content?.summary) return <Text type="secondary">无详细内容</Text>;

  let parsed: any;
  try {
    parsed = typeof content.summary === 'string' ? JSON.parse(content.summary) : content.summary;
  } catch {
    return <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{content.summary}</Paragraph>;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {parsed.overview && (
        <div>
          <Text strong>概述:</Text>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{parsed.overview}</Paragraph>
        </div>
      )}
      {parsed.background && (
        <Collapse
          size="small"
          items={[
            {
              key: 'bg',
              label: '背景',
              children: <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{parsed.background}</Paragraph>,
            },
          ]}
        />
      )}
      {parsed.next_steps && (
        <div>
          <Text strong>下一步操作:</Text>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{parsed.next_steps}</Paragraph>
        </div>
      )}
      {parsed.considerations && (
        <div>
          <Text strong>注意事项:</Text>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{parsed.considerations}</Paragraph>
        </div>
      )}
    </Space>
  );
}

export default function Recommendations() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => listRecommendations() as Promise<any>,
  });

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={3}>推荐建议</Title>
      {error && <Alert type="error" message="加载失败" description={(error as Error).message} showIcon />}
      {!isLoading && (!data?.recommendations || data.recommendations.length === 0) && (
        <Card>
          <Empty description="暂无推荐建议" />
        </Card>
      )}
      <List
        loading={isLoading}
        dataSource={data?.recommendations || []}
        renderItem={(rec: any) => {
          const status = getStatus(rec.status);
          const priority = getPriority(rec.priority);
          return (
            <Card style={{ marginBottom: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={5} style={{ margin: 0 }}>
                    {rec.title}
                  </Title>
                  <Space>
                    <Tag color={status.color}>{status.label}</Tag>
                    <Tag color={priority.color}>{priority.label}</Tag>
                  </Space>
                </div>
                <Text type="secondary">
                  创建于 {dayjs(rec.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
                <RecommendationContent content={rec.content} />
                {rec.taskId && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate(`/tasks/${rec.taskId}`)}
                    style={{ padding: 0 }}
                  >
                    查看关联调查
                  </Button>
                )}
              </Space>
            </Card>
          );
        }}
      />
    </Space>
  );
}
