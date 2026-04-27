import { useState, useEffect } from 'react';
import { adminLookupAPI } from '../services/api';
import { Spinner, EmptyState } from '../components/FormElements';
import '../components/Layout.css';

// Response shape:
//   GET /api/admin/lookup/meal-sizes  → { data: { mealSizes: [{ id, name, display_name, sort_order }] } }
//   GET /api/admin/lookup/standards   → { data: { standards: [{ id, name, display_name, numeric_value }] } }

function LookupGrid({ items, colorRgb, getLabel, getSubLabel }) {
  if (!items) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>;
  if (items.length === 0) return <EmptyState title="No data" description="No lookup data found" />;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {items.map((item, i) => (
        <div key={item.id ?? i} style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '12px 18px', borderRadius: 10,
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          minWidth: 110, transition: 'border-color 0.2s',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {getLabel(item)}
          </span>
          {getSubLabel && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getSubLabel(item)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LookupMealSizes() {
  const [mealSizes, setMealSizes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminLookupAPI.getMealSizes()
      // Response: { data: { mealSizes: [] } }
      .then((res) => setMealSizes(res?.data?.mealSizes ?? []))
      .catch(() => setMealSizes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meal Sizes</h1>
          <p className="page-subtitle">Fixed meal size options (Small, Medium, Large) — read-only</p>
        </div>
        <span style={{
          padding: '6px 14px', borderRadius: 20, background: 'var(--accent-bg)',
          color: 'var(--accent-primary)', fontSize: 13, fontWeight: 500
        }}>
          {mealSizes?.length ?? 0} sizes
        </span>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Available Sizes
        </h2>
        <LookupGrid
          items={mealSizes}
          colorRgb="79,110,247"
          getLabel={(item) => item.display_name || item.name}
          getSubLabel={(item) => item.name !== item.display_name ? item.name : null}
        />
      </div>
    </div>
  );
}

export function LookupStandards() {
  const [standards, setStandards] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminLookupAPI.getStandards()
      // Response: { data: { standards: [] } }
      .then((res) => setStandards(res?.data?.standards ?? []))
      .catch(() => setStandards([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Standards</h1>
          <p className="page-subtitle">Student grade standards (1st to 12th) — read-only</p>
        </div>
        <span style={{
          padding: '6px 14px', borderRadius: 20, background: 'rgba(34,211,165,0.1)',
          color: 'var(--success)', fontSize: 13, fontWeight: 500
        }}>
          {standards?.length ?? 0} standards
        </span>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Grade Levels
        </h2>
        <LookupGrid
          items={standards}
          colorRgb="34,211,165"
          getLabel={(item) => item.display_name || item.name}
          getSubLabel={(item) => item.numeric_value != null ? `Grade ${item.numeric_value}` : null}
        />
      </div>
    </div>
  );
}
