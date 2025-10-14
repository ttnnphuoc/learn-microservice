import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import { ProductOutlined, TagsOutlined } from '@ant-design/icons';
import ProductTable from './components/ProductTable';
import CategoryTable from './components/CategoryTable';
import './App.css'

const { Header, Content, Sider } = Layout;

const AppContent: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/products',
      icon: <ProductOutlined />,
      label: 'Products',
    },
    {
      key: '/categories',
      icon: <TagsOutlined />,
      label: 'Categories',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {!collapsed ? 'Management' : 'M'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h1 style={{ margin: 0, lineHeight: '64px' }}>Product Management System</h1>
        </Header>
        <Content style={{ margin: 0, padding: 0 }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 64px)',
              background: colorBgContainer,
            }}
          >
            <Routes>
              <Route path="/" element={<ProductTable />} />
              <Route path="/products" element={<ProductTable />} />
              <Route path="/categories" element={<CategoryTable />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App
