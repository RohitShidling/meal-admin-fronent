import { useEffect, useState, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAuthAPI, TokenService } from '../services/api';
import Sidebar from './Sidebar';
import './Layout.css';

const MOBILE_MAX = 899;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

const PAGE_LABELS = {
  '/dashboard': { title: 'Dashboard', sub: 'Kitchen counts, revenue, and renewals' },
  '/schools': { title: 'Schools', sub: 'Manage school accounts' },
  '/subscriptions': { title: 'Subscriptions', sub: 'Manage meal subscription plans' },
  '/trial-plans': { title: 'Trial Plans', sub: 'Manage trial subscription plans' },
  '/menu': { title: 'Daily Menu', sub: 'Upload and manage daily menus' },
  '/corporate-locations': { title: 'Corporate Locations', sub: 'Manage delivery destinations' },
  '/payments': { title: 'Payments', sub: 'Track payments and revenue' },
  '/homepage': { title: 'Homepage Manager', sub: 'Manage the public Buuttii homepage' },
  '/master-data': { title: 'Master Data', sub: 'Manage states, cities, companies and more' },
  '/meal-size-upgrades': { title: 'Meal Size Upgrades', sub: 'One-time fees for profile meal size bumps' },
  '/token': { title: 'Token', sub: 'Print tokens and meal slips' },
  '/increase-remaining': { title: 'Increase Remaining Meals', sub: 'Adjust remaining meals for subscribers' },
};

export default function Layout() {
  const { isAuthenticated, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const location = useLocation();
  const isMobile = useIsMobile();

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  useEffect(() => {
    if (isMobile) document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, mobileNavOpen]);

  useEffect(() => {
    if (!isMobile || !mobileNavOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMobileNav();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    const stored = localStorage.getItem('admin_theme');
    const initialTheme = stored === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  /** Lock page scroll to the main column so mobile browsers do not add extra “past the end” scroll. */
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const rootEl = document.documentElement;
    rootEl.classList.add('admin-shell');
    document.body.classList.add('admin-shell');
    return () => {
      rootEl.classList.remove('admin-shell');
      document.body.classList.remove('admin-shell');
    };
  }, [isAuthenticated]);

  /** Proactive JWT refresh — avoids logout when ADMIN_JWT_EXPIRES_IN is short; still respects expiry. */
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const bump = () => {
      if (document.visibilityState !== 'visible') return;
      if (!TokenService.getAccessToken()) return;
      adminAuthAPI.refresh().catch(() => {});
    };
    document.addEventListener('visibilitychange', bump);
    const intervalMs = Number(import.meta.env.VITE_ADMIN_TOKEN_REFRESH_INTERVAL_MS) || 10 * 60 * 1000;
    const id = window.setInterval(bump, intervalMs);
    return () => {
      document.removeEventListener('visibilitychange', bump);
      window.clearInterval(id);
    };
  }, [isAuthenticated]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('admin_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sidebarWidth = collapsed ? 64 : 260;
  const mainMarginLeft = isMobile ? 0 : sidebarWidth;
  const pageInfo = PAGE_LABELS[location.pathname] || { title: 'Admin', sub: '' };
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      className={`layout${isMobile ? ' layout--mobile' : ''}${mobileNavOpen ? ' layout--nav-open' : ''}`}
    >
      {isMobile && mobileNavOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={closeMobileNav}
        />
      )}
      <Sidebar
        collapsed={isMobile ? false : collapsed}
        onToggle={() => (isMobile ? setMobileNavOpen((o) => !o) : setCollapsed(!collapsed))}
        isMobile={isMobile}
        mobileOpen={mobileNavOpen}
        onMobileNavSelect={closeMobileNav}
      />
      <div className="layout-main" style={{ marginLeft: mainMarginLeft }}>

        {/* ── Top Header Bar ── */}
        <header className="topbar">
          <div className="topbar-left">
            {isMobile && (
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
            )}
            <div className="topbar-titles">
              <h1 className="topbar-title">{pageInfo.title}</h1>
              {pageInfo.sub && <p className="topbar-sub">{pageInfo.sub}</p>}
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
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
