import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import './Layout.css';

const PAGE_LABELS = {
  '/dashboard': { title: 'Dashboard', sub: 'Welcome back' },
  '/schools': { title: 'Schools', sub: 'Manage school accounts' },
  '/subscriptions': { title: 'Subscriptions', sub: 'Manage meal subscription plans' },
  '/trial-plans': { title: 'Trial Plans', sub: 'Manage trial subscription plans' },
  '/menu': { title: 'Daily Menu', sub: 'Upload and manage daily menus' },
  '/corporate-locations': { title: 'Corporate Locations', sub: 'Manage delivery destinations' },
  '/payments': { title: 'Payments', sub: 'Track payments and revenue' },
  '/homepage': { title: 'Homepage Manager', sub: 'Manage the public Buuttii homepage' },
  '/master-data': { title: 'Master Data', sub: 'Manage states, cities, companies and more' },
};

export default function Layout() {
  const { isAuthenticated, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sidebarWidth = collapsed ? 64 : 260;
  const pageInfo = PAGE_LABELS[location.pathname] || { title: 'Dashboard', sub: '' };
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="layout-main" style={{ marginLeft: sidebarWidth }}>

        {/* ── Top Header Bar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{pageInfo.title}</h1>
            {pageInfo.sub && <p className="topbar-sub">{pageInfo.sub}</p>}
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            <div className="topbar-user-chip">
              <div className="topbar-avatar">
                {(user?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="topbar-username">{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
