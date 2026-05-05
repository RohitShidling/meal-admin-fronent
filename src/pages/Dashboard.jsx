import { useEffect, useState } from 'react';
import { adminDashboardAPI, adminMealsAPI, adminAnalyticsAPI } from '../services/api';
import { Spinner, Button } from '../components/FormElements';
import { toast } from '../components/Toast';
import '../components/Layout.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ schools: 0, subscriptions: 0, locations: 0, menus: 0, revenue: 0 });
  const [mealSizes, setMealSizes] = useState([]);
  const [standards, setStandards] = useState([]);
  const [kitchenReport, setKitchenReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reducing, setReducing] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, kitchenRes, analyticsRes, expiringRes] = await Promise.all([
        adminDashboardAPI.getStats(),
        adminMealsAPI.getKitchenReport(),
        adminAnalyticsAPI.getOverview(),
        adminAnalyticsAPI.getExpiringSoon(7)
      ]);

      setStats(dashRes.data.stats);
      setMealSizes(dashRes.data.mealSizes);
      setStandards(dashRes.data.standards);
      setKitchenReport(kitchenRes.data);
      setAnalytics(analyticsRes.data);
      setExpiringSoon(expiringRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReduceMeals = async () => {
    if (!window.confirm('Are you sure you want to reduce meals for today? This can only be done once per day.')) return;
    setReducing(true);
    try {
      const res = await adminMealsAPI.reduceToday();
      toast.success(res.message);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to reduce meals');
    } finally {
      setReducing(false);
    }
  };

  const handleDownloadTokens = () => {
    window.open(adminMealsAPI.getTokensAll(), '_blank');
  };

  const statCards = [
    { label: 'Total Schools', value: stats.schools, icon: SchoolIcon, cls: 'stat-icon-blue' },
    { label: 'Total Revenue', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.revenue), icon: RevenueIcon, cls: 'stat-icon-green' },
    { label: 'Active Subscriptions', value: stats.subscriptions, icon: CardIcon, cls: 'stat-icon-blue' },
    { label: 'Corporate Locations', value: stats.locations, icon: PinIcon, cls: 'stat-icon-orange' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Operational overview and quick actions for today.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" onClick={handleDownloadTokens}>Download Tokens</Button>
          <Button loading={reducing} onClick={handleReduceMeals}>Reduce Meals Today</Button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Kitchen Report */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Today's Kitchen Report</h2>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{kitchenReport?.date}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 16, background: 'var(--bg-hover)', borderRadius: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{kitchenReport?.active_today}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total Meals to Cook</div>
            </div>
            <div style={{ padding: 16, background: 'var(--bg-hover)', borderRadius: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{kitchenReport?.total_subscribed}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total Subscribers</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Size Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {kitchenReport?.meal_sizes?.map(sz => (
                <div key={sz.size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{sz.size}</span>
                  <span style={{ fontWeight: 600, padding: '2px 10px', background: 'var(--accent-bg)', color: 'var(--accent-primary)', borderRadius: 12, fontSize: 13 }}>{sz.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Analytics */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Revenue by Category</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {analytics?.byEntityType?.map(ent => (
              <div key={ent.entity_type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{ent.entity_type}s</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(ent.total_revenue)}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(ent.total_revenue / analytics.totals.grand_revenue) * 100}%`,
                    background: ent.entity_type === 'child' ? '#3b82f6' : ent.entity_type === 'teacher' ? '#10b981' : '#f59e0b'
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Total: {ent.total_subscribed}</span>
                  <span>Active: {ent.active_count}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: 16, background: 'var(--accent-bg)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>Grand Total Revenue</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>
               {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(analytics?.totals?.grand_revenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Expiring Soon & Active Members */}
      <div style={{ marginTop: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            Expiring Within 7 Days
            {expiringSoon.length > 0 && <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>{expiringSoon.length} Alerts</span>}
          </h2>
          {expiringSoon.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No subscriptions expiring within the next 7 days.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Member</th>
                    <th style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Institution</th>
                    <th style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Phone</th>
                    <th style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</th>
                    <th style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringSoon.map((sub, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px', fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{sub.entity_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sub.entity_type}</div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text-secondary)' }}>{sub.institution_name}</td>
                      <td style={{ padding: '12px 8px', fontSize: 13 }}>{sub.client_phone}</td>
                      <td style={{ padding: '12px 8px', fontSize: 13 }}>{new Date(sub.end_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 8px', fontSize: 13 }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: sub.days_remaining <= 2 ? '#ef4444' : '#f59e0b',
                          background: sub.days_remaining <= 2 ? '#fee2e2' : '#fef3c7',
                          padding: '2px 8px', borderRadius: 12
                        }}>
                          {sub.days_remaining}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Meals to Prepare Today</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {(kitchenReport?.meal_sizes || []).map((sz) => (
              <div key={sz.size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>{sz.size}</span>
                <span style={{ fontWeight: 700, padding: '2px 10px', background: 'var(--accent-bg)', color: 'var(--accent-primary)', borderRadius: 12, fontSize: 13 }}>
                  {sz.count}
                </span>
              </div>
            ))}
            {(!kitchenReport?.meal_sizes || kitchenReport.meal_sizes.length === 0) && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active meal sizes for today.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Standards</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {standards.map((s) => (
              <span key={s.id} className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {s.display_name || s.name}
              </span>
            ))}
          </div>
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
function RevenueIcon() {
  return (
    <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
      ₹
    </span>
  );
}
