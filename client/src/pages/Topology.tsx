import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Space, Alert, Empty, Tag, Table, Descriptions, Spin } from 'antd';
import {
  CloudServerOutlined,
  GithubOutlined,
  SlackOutlined,
  ApiOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { listAssociations, listServices } from '../api/client';

const { Title, Text } = Typography;

const serviceTypeIcon: Record<string, React.ReactNode> = {
  github: <GithubOutlined />,
  slack: <SlackOutlined />,
  aws: <CloudServerOutlined />,
  sourceAws: <CloudServerOutlined />,
  azure: <CloudServerOutlined />,
  azuredevops: <ApiOutlined />,
  dynatrace: <ApiOutlined />,
  servicenow: <ApiOutlined />,
  pagerduty: <ApiOutlined />,
  gitlab: <ApiOutlined />,
  eventChannel: <LinkOutlined />,
  mcpserver: <ApiOutlined />,
  mcpservernewrelic: <ApiOutlined />,
  mcpservergrafana: <ApiOutlined />,
  mcpserverdatadog: <ApiOutlined />,
  mcpserversplunk: <ApiOutlined />,
};

const serviceTypeLabel: Record<string, string> = {
  github: 'GitHub',
  slack: 'Slack',
  aws: 'AWS',
  sourceAws: 'AWS (Source)',
  azure: 'Azure',
  azuredevops: 'Azure DevOps',
  dynatrace: 'Dynatrace',
  servicenow: 'ServiceNow',
  pagerduty: 'PagerDuty',
  gitlab: 'GitLab',
  eventChannel: 'Event Channel',
  mcpserver: 'MCP Server',
  mcpservernewrelic: 'New Relic (MCP)',
  mcpservergrafana: 'Grafana (MCP)',
  mcpserverdatadog: 'Datadog (MCP)',
  mcpserversplunk: 'Splunk (MCP)',
  azureidentity: 'Azure Identity',
};

const statusColor: Record<string, string> = {
  valid: 'success',
  invalid: 'error',
  'pending-confirmation': 'warning',
};

function getAssociationType(record: any): string {
  if (!record.configuration) return 'unknown';
  return Object.keys(record.configuration)[0] || 'unknown';
}

function getAssociationName(record: any): string {
  const config = record.configuration;
  if (!config) return record.serviceId || record.associationId;
  const type = Object.keys(config)[0];
  const detail = config[type];
  if (!detail) return record.serviceId || record.associationId;
  if (detail.repoName) return `${detail.owner}/${detail.repoName}`;
  if (detail.projectPath) return detail.projectPath;
  if (detail.workspaceName) return detail.workspaceName;
  if (detail.organizationName && detail.projectName) return `${detail.organizationName}/${detail.projectName}`;
  if (detail.organizationName) return detail.organizationName;
  if (detail.accountId) return `Account ${detail.accountId}`;
  if (detail.endpoint) return detail.endpoint;
  if (detail.instanceId) return detail.instanceId;
  if (detail.subscriptionId) return `Subscription ${detail.subscriptionId}`;
  return record.serviceId || record.associationId;
}

function AssociationDetail({ config }: { config: any }) {
  if (!config) return <Text type="secondary">无配置详情</Text>;

  const type = Object.keys(config)[0];
  const detail = config[type];
  if (!detail) return <Text type="secondary">无配置详情</Text>;

  const items: { label: string; value: string }[] = [];
  if (detail.accountId) items.push({ label: '账号 ID', value: detail.accountId });
  if (detail.accountType) items.push({ label: '账号类型', value: detail.accountType });
  if (detail.assumableRoleArn) items.push({ label: '角色 ARN', value: detail.assumableRoleArn });
  if (detail.repoName) items.push({ label: '仓库', value: `${detail.owner}/${detail.repoName}` });
  if (detail.repoId) items.push({ label: '仓库 ID', value: detail.repoId });
  if (detail.projectPath) items.push({ label: '项目路径', value: detail.projectPath });
  if (detail.projectId) items.push({ label: '项目 ID', value: detail.projectId });
  if (detail.workspaceId) items.push({ label: '工作区 ID', value: detail.workspaceId });
  if (detail.workspaceName) items.push({ label: '工作区名', value: detail.workspaceName });
  if (detail.envId) items.push({ label: '环境 ID', value: detail.envId });
  if (detail.instanceUrl) items.push({ label: '实例 URL', value: detail.instanceUrl });
  if (detail.endpoint) items.push({ label: '端点', value: detail.endpoint });
  if (detail.organizationName) items.push({ label: '组织', value: detail.organizationName });
  if (detail.projectName) items.push({ label: '项目名', value: detail.projectName });
  if (detail.subscriptionId) items.push({ label: '订阅 ID', value: detail.subscriptionId });
  if (detail.tools) items.push({ label: '工具', value: detail.tools.join(', ') });
  if (detail.services) items.push({ label: '服务', value: detail.services.join(', ') });
  if (detail.customerEmail) items.push({ label: '邮箱', value: detail.customerEmail });

  if (items.length === 0) return <Text type="secondary">配置类型: {type}</Text>;

  return (
    <Descriptions size="small" column={1} bordered>
      {items.map((item, i) => (
        <Descriptions.Item key={i} label={item.label}>
          <Text copyable style={{ fontSize: 12 }}>{item.value}</Text>
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

export default function Topology() {
  const { data: assocData, isLoading: assocLoading, error: assocError } = useQuery({
    queryKey: ['topology-associations'],
    queryFn: () => listAssociations() as Promise<any>,
  });

  const { data: svcData, isLoading: svcLoading } = useQuery({
    queryKey: ['topology-services'],
    queryFn: () => listServices() as Promise<any>,
    retry: false,
  });

  const associations = assocData?.associations || [];
  const services = svcData?.services || [];

  const assocColumns = [
    {
      title: '服务类型',
      key: 'serviceType',
      width: 160,
      render: (_: any, record: any) => {
        const svc = services.find((s: any) => s.serviceId === record.serviceId);
        const type = svc?.serviceType || getAssociationType(record);
        return (
          <Space>
            {serviceTypeIcon[type] || <ApiOutlined />}
            <span>{serviceTypeLabel[type] || type}</span>
          </Space>
        );
      },
    },
    {
      title: '名称',
      key: 'name',
      ellipsis: true,
      render: (_: any, record: any) => {
        const svc = services.find((s: any) => s.serviceId === record.serviceId);
        return svc?.name || getAssociationName(record);
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => v ? (
        <Tag color={statusColor[v] || 'default'}>
          {v === 'valid' ? '已连接' : v === 'invalid' ? '无效' : v === 'pending-confirmation' ? '待确认' : v}
        </Tag>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={3}>拓扑</Title>

      {assocError && (
        <Alert
          type="error"
          message="加载关联失败"
          description={(assocError as Error)?.message}
          showIcon
        />
      )}

      {/* 已注册服务（账号级,可能无权限） */}
      {services.length > 0 && (
        <Card title="已注册服务" size="small">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {services.map((svc: any) => (
              <Card key={svc.serviceId} size="small" style={{ width: 260 }}>
                <Space>
                  {serviceTypeIcon[svc.serviceType] || <ApiOutlined />}
                  <div>
                    <div style={{ fontWeight: 500 }}>{svc.name || svc.serviceId}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {serviceTypeLabel[svc.serviceType] || svc.serviceType}
                    </Text>
                  </div>
                </Space>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* 关联列表 */}
      <Card title="已关联服务" size="small">
        {assocLoading || svcLoading ? (
          <Spin tip="加载中..." />
        ) : associations.length === 0 ? (
          <Empty description="暂无关联服务" />
        ) : (
          <Table
            dataSource={associations}
            columns={assocColumns}
            rowKey="associationId"
            pagination={false}
            size="small"
            expandable={{
              expandedRowRender: (record: any) => <AssociationDetail config={record.configuration} />,
            }}
          />
        )}
      </Card>
    </Space>
  );
}
