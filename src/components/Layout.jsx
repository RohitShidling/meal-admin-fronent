import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sidebarWidth = collapsed ? 64 : 260;

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="layout-main" style={{ marginLeft: sidebarWidth }}>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
