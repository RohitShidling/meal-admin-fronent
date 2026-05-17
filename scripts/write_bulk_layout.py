path = r"D:\meal-admin-fronent\src\pages\bulk-orders\BulkOrdersLayout.jsx"
content = """import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import '../../components/Layout.css';

const TABS = [
  { to: '/bulk-orders/settings', label: 'Settings' },
  { to: '/bulk-orders/categories', label: 'Categories' },
  { to: '/bulk-orders/meals', label: 'Meals' },
  { to: '/bulk-orders/orders', label: 'Orders' },
];

export default function BulkOrdersLayout() {
  const location = useLocation();
  if (location.pathname === '/bulk-orders' || location.pathname === '/bulk-orders/') {
    return <Navigate to="/bulk-orders/settings" replace />;
  }

  return (
    <WRAPPER>
      <WRAPPER className="page-header">
        <WRAPPER>
          <h1 className="page-title">Bulk Orders</h1>
          <p className="page-subtitle">
            Configure standard and large-event bulk ordering. Homepage card entity name: <strong>bulk</strong>.
          </p>
        </WRAPPER>
      </WRAPPER>
      <nav
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 24,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-muted)' : 'transparent',
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </WRAPPER>
  );
}
"""
content = content.replace("<WRAPPER", "<div").replace("</WRAPPER>", "</div>")
open(path, "w", encoding="utf-8").write(content)
