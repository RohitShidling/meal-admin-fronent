import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Orders</h1>
          <p className="page-subtitle">
            Configure standard and large-event bulk ordering. Homepage card entity name: <strong>bulk</strong>.
          </p>
        </div>
      </div>
      <nav
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 10,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          minWidth: 0,
        }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            style={({ isActive }) => ({
              padding: '8px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              border: 'none',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              background: isActive ? 'var(--accent-primary)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: 14,
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}




