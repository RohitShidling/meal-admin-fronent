import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from './Toast';
import './Sidebar.css';

const navItems = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      )},
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'Schools', path: '/schools', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )},
      { label: 'Subscriptions', path: '/subscriptions', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      )},

      { label: 'Menu', path: '/menu', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      )},
      { label: 'Corporate Locations', path: '/corporate-locations', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      )},
      { label: 'Payments', path: '/payments', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          <path d="M16 14h.01M12 14h.01M8 14h.01"/>
        </svg>
      )},
      { label: 'Homepage', path: '/homepage', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      )},
      { label: 'Token', path: '/token', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/>
        </svg>
      )},
      { label: 'Increase Remaining', path: '/increase-remaining', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      )},
    ],
  },
  {
    group: 'Configuration',
    items: [
      { label: 'Master Data', path: '/master-data', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
      )},
      { label: 'Bulk Orders', path: '/bulk-orders', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      )},
      { label: 'Size Upgrades', path: '/meal-size-upgrades', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
        </svg>
      )},
    ],
  },
];

export default function Sidebar({
  collapsed,
  onToggle,
  isMobile = false,
  mobileOpen = false,
  onMobileNavSelect,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Get display name: prefer username, fall back to phone
  const displayName = user?.username || user?.phoneNumber || 'Admin';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Get current page label for top bar
  const currentPage = navItems
    .flatMap(g => g.items)
    .find(i => location.pathname.startsWith(i.path))?.label || 'Dashboard';

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}${isMobile ? ' sidebar--mobile' : ''}${isMobile && mobileOpen ? ' sidebar--mobile-open' : ''}`}
    >

      {/* Floating toggle tab — always on right edge, always visible */}
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        id="sidebar-toggle-btn"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {collapsed
            ? <polyline points="9 18 15 12 9 6"/>
            : <polyline points="15 18 9 12 15 6"/>}
        </svg>
      </button>

      {/* Inner content — clipped separately from the toggle tab */}
      <div className="sidebar-inner">

        {/* ── Logo area ── */}
        <div className="sidebar-logo">
          {collapsed ? (
            <div className="sidebar-logo-icon-only">
              <img src="/logo.png" alt="Buuttii" />
            </div>
          ) : (
            <div className="sidebar-logo-full">
              <img src="/logo.png" alt="Buuttii" className="sidebar-logo-img" />
              <div className="sidebar-logo-text-wrap">
                <span className="sidebar-brand-name">BUUTTII</span>
                <span className="sidebar-brand-sub">Admin Portal</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav">
          {navItems.map((group) => (
            <div key={group.group} className="nav-group">
              {!collapsed && <span className="nav-group-label">{group.group}</span>}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    if (isMobile) onMobileNavSelect?.();
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Admin profile footer ── */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">Administrator</span>
              </div>
            )}
          </div>
          <button
            className="logout-btn"
            onClick={() => {
              if (isMobile) onMobileNavSelect?.();
              handleLogout();
            }}
            title="Logout"
            id="logout-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

      </div> {/* end .sidebar-inner */}
    </aside>
  );
}
