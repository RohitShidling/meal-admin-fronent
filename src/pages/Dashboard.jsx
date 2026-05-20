import { useEffect, useState } from 'react';
import { adminDashboardAPI, adminMealsAPI, adminAnalyticsAPI } from '../services/api';
import { Spinner } from '../components/FormElements';
import { toast } from '../components/Toast';
import '../components/Layout.css';
import './Dashboard.css';

function formatEntityTypeLabel(type) {
  if (!type) return 'Other';
  const key = String(type).toLowerCase();
  const map = {
    child: 'Students',
    teacher: 'Teachers',
    professional: 'Corporate',
    bulk: 'Bulk orders',
  };
  return map[key] || key.replace(/_/g, ' ');
}

function addDaysYmd(ymd, days) {
  if (!ymd) return '';
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function bulkOrdersFilterHref({ dateField = 'delivery', startDate = '', endDate = '', status = 'confirmed' }) {
  const params = new URLSearchParams();
  if (dateField) params.set('date_field', dateField);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (status) params.set('status', status);
  const q = params.toString();
  return `/bulk-orders/orders${q ? `?${q}` : ''}`;
}

function entityRevenueBarColor(type) {
  const key = String(type || '').toLowerCase();
  if (key === 'child') return '#3b82f6';
  if (key === 'teacher') return '#10b981';
  if (key === 'professional') return '#f59e0b';
  if (key === 'bulk') return '#8b5cf6';
  return 'var(--accent-primary)';
}

export default function Dashboard() {
  const [stats, setStats] = useState({ schools: 0, subscriptions: 0, locations: 0, menus: 0, revenue: 0 });
  const [kitchenReport, setKitchenReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  /** child | teacher | professional | '' (all) — low remaining meals panel */
  const [renewalCategory, setRenewalCategory] = useState('');
  const [lowMealAlerts, setLowMealAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [dashRes, kitchenRes, analyticsRes, lowRes] = await Promise.all([
        adminDashboardAPI.getStats(),
        adminMealsAPI.getKitchenReport(),
        adminAnalyticsAPI.getOverview(),
        adminAnalyticsAPI.getLowRemainingMeals({
          maxRemaining: 5,
          ...(renewalCategory ? { entityType: renewalCategory } : {}),
        }),
      ]);

      setStats(dashRes.data.stats);
      setKitchenReport(kitchenRes.data);
      setAnalytics(analyticsRes.data);
      setLowMealAlerts(lowRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [renewalCategory]);

  const grandRevenue = Number(analytics?.totals?.grand_revenue) || 0;
  const byEntity = Array.isArray(analytics?.byEntityType) ? analytics.byEntityType : [];

  const statCards = [
    { label: 'Schools', value: stats.schools, icon: SchoolIcon, cls: 'stat-icon-blue' },
    {
      label: 'Revenue (all time)',
      value: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(stats.revenue),
      icon: RevenueIcon,
      cls: 'stat-icon-green',
    },
    { label: 'Active subscriptions', value: stats.subscriptions, icon: CardIcon, cls: 'stat-icon-blue' },
    { label: 'Corporate locations', value: stats.locations, icon: PinIcon, cls: 'stat-icon-orange' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>
              <s.icon />
            </div>
            <div className="stat-content">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid-2">
        <div className="card">
          <div className="dashboard-card-head">
            <h2 className="dashboard-card-title">Kitchen report (today)</h2>
            <span className="dashboard-card-meta">{kitchenReport?.date}</span>
          </div>
          <div className="dashboard-kpis">
            <div className="dashboard-kpi-tile">
              <div className="dashboard-kpi-value">{kitchenReport?.active_today ?? '—'}</div>
              <div className="dashboard-kpi-label">Meals to prepare today</div>
            </div>
            <div className="dashboard-kpi-tile">
              <div className="dashboard-kpi-value">{kitchenReport?.total_subscribed ?? '—'}</div>
              <div className="dashboard-kpi-label">Subscribers counted for today</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h3 className="dashboard-section-title">Meals by portion size</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {kitchenReport?.meal_sizes?.map((sz) => (
                <div key={sz.size} className="dashboard-size-row">
                  <span title={sz.size}>{sz.size}</span>
                  <span className="dashboard-size-pill">{sz.count}</span>
                </div>
              ))}
              {(!kitchenReport?.meal_sizes || kitchenReport.meal_sizes.length === 0) && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  No portion sizes scheduled for today.
                </p>
              )}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <h3 className="dashboard-section-title">Bulk orders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="dashboard-size-row">
                <a
                  href={bulkOrdersFilterHref({
                    startDate: kitchenReport?.date,
                    endDate: kitchenReport?.date,
                  })}
                  style={{ color: 'inherit', textDecoration: 'none', flex: 1 }}
                >
                  Delivering today
                </a>
                <span className="dashboard-size-pill">
                  {kitchenReport?.bulk_orders?.delivery_today_count ?? 0}
                </span>
              </div>
              <div className="dashboard-size-row">
                <a
                  href={bulkOrdersFilterHref({
                    startDate: addDaysYmd(kitchenReport?.date, 1),
                    endDate: addDaysYmd(kitchenReport?.date, 1),
                  })}
                  style={{ color: 'inherit', textDecoration: 'none', flex: 1 }}
                >
                  Delivering tomorrow
                </a>
                <span className="dashboard-size-pill">
                  {kitchenReport?.bulk_orders?.delivery_tomorrow_count ?? 0}
                </span>
              </div>
              <div className="dashboard-size-row">
                <span>Upcoming</span>
                <span className="dashboard-size-pill">
                  {kitchenReport?.bulk_orders?.pending_total ?? 0}
                </span>
              </div>
            </div>
            <a
              href="/bulk-orders/orders"
              style={{
                display: 'inline-block',
                marginTop: 12,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--accent-primary)',
                textDecoration: 'none',
              }}
            >
              View bulk orders →
            </a>
          </div>
        </div>

        <div className="card">
          <h2 className="dashboard-card-title" style={{ marginBottom: 20 }}>
            Revenue by subscriber type
          </h2>
          {byEntity.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No revenue data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {byEntity.map((ent) => {
                const rev = Number(ent.total_revenue) || 0;
                const pct = grandRevenue > 0 ? (rev / grandRevenue) * 100 : 0;
                return (
                  <div key={ent.entity_type}>
                    <div className="dashboard-revenue-row-head">
                      <span className="dashboard-revenue-label">{formatEntityTypeLabel(ent.entity_type)}</span>
                      <span className="dashboard-revenue-amount">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rev)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          background: entityRevenueBarColor(ent.entity_type),
                        }}
                      />
                    </div>
                    <div className="dashboard-revenue-meta">
                      {String(ent.entity_type).toLowerCase() === 'bulk' ? (
                        <>
                          <span>Orders: {ent.total_subscribed ?? 0}</span>
                          <span>Active / pending: {ent.active_count ?? 0}</span>
                        </>
                      ) : (
                        <>
                          <span>Subscriptions: {ent.total_subscribed ?? 0}</span>
                          <span>Active: {ent.active_count ?? 0}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="dashboard-grand-total">
            <span className="dashboard-grand-total-label">Total tracked revenue</span>
            <span className="dashboard-grand-total-value">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandRevenue)}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-section-spaced">
        <div className="card">
          <h2 className="dashboard-expiring-head" style={{ flexWrap: 'wrap', gap: 12 }}>
            <span>Low remaining meals (≤5)</span>
            {lowMealAlerts.length > 0 && (
              <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                {lowMealAlerts.length} {lowMealAlerts.length === 1 ? 'subscription' : 'subscriptions'}
              </span>
            )}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.45 }}>
            Based on meals left on the subscription, not calendar dates. Filters apply to Students, Teachers, or Corporate subscribers.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { id: '', label: 'All' },
              { id: 'child', label: 'Students' },
              { id: 'teacher', label: 'Teachers' },
              { id: 'professional', label: 'Professionals' },
            ].map((tab) => (
              <button
                key={tab.id || 'all'}
                type="button"
                onClick={() => setRenewalCategory(tab.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  background: renewalCategory === tab.id ? 'var(--accent-primary)' : 'var(--bg-hover)',
                  color: renewalCategory === tab.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {lowMealAlerts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0', margin: 0 }}>
              No active subscriptions have 5 meals or fewer remaining.
            </p>
          ) : (
            <>
              <div className="table-wrapper dashboard-expiring-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>School / workplace</th>
                      <th>Phone</th>
                      <th>Plan</th>
                      <th>Remaining</th>
                      <th>End date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowMealAlerts.map((sub, idx) => (
                      <tr key={`${sub.entity_type}-${sub.entity_id}-${idx}`}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{sub.entity_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatEntityTypeLabel(sub.entity_type)}
                          </div>
                        </td>
                        <td>{sub.institution_name}</td>
                        <td>{sub.client_phone}</td>
                        <td>{sub.plan_name}</td>
                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              color: sub.remaining_meals <= 2 ? '#ef4444' : '#f59e0b',
                              background: sub.remaining_meals <= 2 ? '#fee2e2' : '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: 12,
                            }}
                          >
                            {sub.remaining_meals}
                          </span>
                        </td>
                        <td>{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="dashboard-expiring-cards" aria-label="Low remaining meals">
                {lowMealAlerts.map((sub, idx) => (
                  <li key={`${sub.entity_type}-${sub.entity_id}-m-${idx}`} className="dashboard-expiring-card">
                    <h3>{sub.entity_name}</h3>
                    <div className="meta">{formatEntityTypeLabel(sub.entity_type)}</div>
                    <div className="row">
                      <span>School / workplace</span>
                      <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{sub.institution_name}</span>
                    </div>
                    <div className="row">
                      <span>Phone</span>
                      <span>{sub.client_phone}</span>
                    </div>
                    <div className="row">
                      <span>Plan</span>
                      <span>{sub.plan_name}</span>
                    </div>
                    <div className="row">
                      <span>Remaining meals</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: sub.remaining_meals <= 2 ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {sub.remaining_meals}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

function SchoolIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function RevenueIcon() {
  return (
    <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
      ₹
    </span>
  );
}
