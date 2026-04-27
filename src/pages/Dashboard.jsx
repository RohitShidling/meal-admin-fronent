import { useEffect, useState } from 'react';
import { commonAPI, adminLookupAPI } from '../services/api';
import { Spinner } from '../components/FormElements';
import '../components/Layout.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ schools: 0, subscriptions: 0, locations: 0, menus: 0 });
  const [mealSizes, setMealSizes] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      commonAPI.getSchools(),           // { data: { schools: [] } } or { data: [] }
      commonAPI.getSubscriptions(),     // { count, data: [] }
      commonAPI.getCorporateLocations(),// { count, data: [] }
      commonAPI.getMenuHistory(),       // { count, data: [] }
      adminLookupAPI.getMealSizes(),    // { data: { mealSizes: [] } }
      adminLookupAPI.getStandards(),    // { data: { standards: [] } }
    ]).then(([schools, subs, locs, menus, sizes, stds]) => {
      // Schools can be { data: { schools: [] } } or { data: [] }
      const schoolList = schools.value?.data?.schools ?? (Array.isArray(schools.value?.data) ? schools.value.data : []);
      const subList = Array.isArray(subs.value?.data) ? subs.value.data : [];
      const locList = Array.isArray(locs.value?.data) ? locs.value.data : [];
      const menuList = Array.isArray(menus.value?.data) ? menus.value.data : [];

      setStats({
        schools: schools.value?.count ?? schoolList.length,
        subscriptions: subs.value?.count ?? subList.length,
        locations: locs.value?.count ?? locList.length,
        menus: menus.value?.count ?? menuList.length,
      });

      setMealSizes(sizes.value?.data?.mealSizes ?? []);
      setStandards(stds.value?.data?.standards ?? []);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: 'Total Schools', value: stats.schools, icon: SchoolIcon, cls: 'stat-icon-blue' },
    { label: 'Subscriptions', value: stats.subscriptions, icon: CardIcon, cls: 'stat-icon-green' },
    { label: 'Corporate Locations', value: stats.locations, icon: PinIcon, cls: 'stat-icon-orange' },
    { label: 'Menu Entries', value: stats.menus, icon: MenuIcon, cls: 'stat-icon-red' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's a quick overview.</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><s.icon /></div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Meal Sizes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({mealSizes.length})</span>
          </h2>
          {mealSizes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No meal sizes configured.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {mealSizes.map((s) => (
                <span key={s.id} style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: 'var(--accent-bg)', color: 'var(--accent-primary)',
                  fontSize: 13, fontWeight: 500
                }}>{s.display_name || s.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Standards <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({standards.length})</span>
          </h2>
          {standards.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No standards configured.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {standards.map((s) => (
                <span key={s.id} style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500
                }}>{s.display_name || s.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchoolIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function CardIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function PinIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function MenuIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}
