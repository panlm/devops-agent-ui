import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, theme, Badge, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  SearchOutlined,
  PlusCircleOutlined,
  MessageOutlined,
  BulbOutlined,
  CloudServerOutlined,
  SwapOutlined,
  FileTextOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { getHealth } from '../api/client';
import { deriveHealthIndicator } from '../utils/health';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

// 顶栏右侧的后端健康指示：通过 api/client 调 /api/health，react-query 每 30s 轮询一次。
function HealthIndicator() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  });

  const indicator = deriveHealthIndicator(data, isError);

  const tooltip = data ? (
    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
      <div>凭证: {data.aws_credentials ? '已加载' : '未加载'}</div>
      <div>Agent Space: {data.agent_space_id_configured ? '已配置' : '未配置'}</div>
      <div>版本: {data.version}</div>
      <div>运行时长: {data.uptime_seconds}s</div>
    </div>
  ) : (
    '无法连接后端 /api/health'
  );

  return (
    <Tooltip title={tooltip}>
      <span style={{ cursor: 'default' }}>
        <Badge status={indicator.color} text={indicator.label} />
      </span>
    </Tooltip>
  );
}

const menuItems = [
  { key: '/new', icon: <PlusCircleOutlined />, label: '新建调查' },
  { key: '/tasks', icon: <SearchOutlined />, label: '调查列表' },
  { key: '/chat', icon: <MessageOutlined />, label: '运维对话' },
  { key: '/recommendations', icon: <BulbOutlined />, label: '推荐建议' },
  { key: '/changes', icon: <SwapOutlined />, label: '变更' },
  { key: '/artifacts', icon: <FileTextOutlined />, label: '制品' },
  { key: '/topology', icon: <ApartmentOutlined />, label: '拓扑' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key || '/tasks';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={200}
      >
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '8px 0',
          }}
        >
          <CloudServerOutlined style={{ fontSize: 24, color: '#fff', marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 14, whiteSpace: 'nowrap' }}>
              DevOps Agent
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            AWS DevOps Agent 运维控制台
          </Text>
          <HealthIndicator />
        </Header>
        <Content style={{ margin: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
