import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, theme } from 'antd';
import {
  SearchOutlined,
  PlusCircleOutlined,
  BulbOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/tasks', icon: <SearchOutlined />, label: '调查列表' },
  { key: '/new', icon: <PlusCircleOutlined />, label: '新建调查' },
  { key: '/recommendations', icon: <BulbOutlined />, label: '推荐建议' },
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
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            AWS DevOps Agent 运维控制台
          </Text>
        </Header>
        <Content style={{ margin: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
