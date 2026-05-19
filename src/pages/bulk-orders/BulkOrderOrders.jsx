import { useState, useEffect, useCallback } from 'react';
import { adminBulkOrdersAPI } from '../../services/api';
import { Button, Spinner, Badge, EmptyState } from '../../components/FormElements';
import { toast } from '../../components/Toast';
import {
  ORDER_STATUS_COLORS,
  formatOrderStatus,
  formatBulkTierMode,
  formatInr,
  formatBulkDate,
  formatBulkDateTime,
  formatBulkDeliveryAddress,
  parseOrderItems,
} from './shared';

const PAGE_SIZE = 20;

const defaultFilters = {
  tier_mode: '',
  category_id: '',
  date_field: 'ordered',
  start_date: '',
  end_date: '',
  status: '',
  search: '',
  page: 1,
  limit: PAGE_SIZE,
};

const filterSelectStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
};

function buildOrderQuery(f) {
  const q = {
    page: f.page,
    limit: f.limit,
    date_field: f.date_field,
    tier_mode: f.tier_mode,
    category_id: f.category_id,
    start_date: f.start_date,
    end_date: f.end_date,
    status: f.status,
    search: f.search?.trim(),
  };
  Object.keys(q).forEach((k) => {
    if (q[k] === '' || q[k] == null) delete q[k];
  });
  return q;
}

function parseCategories(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function OrderLineItems({ order }) {
  const items = parseOrderItems(order.items);
  const tier = formatBulkTierMode(order.tier_mode);

  if (items.length === 0) {
    return <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No line items recorded.</p>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {tier.short === 'Standard' ? 'Meal (delivery day menu)' : 'Meals ordered'}
      </p>
      <table className="data-table" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>Meal</th>
            <th>Category</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Rate</th>
            <th style={{ textAlign: 'right' }}>Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((line) => (
            <tr key={line.id ?? `${line.meal_name}-${line.quantity}`}>
              <td>
                {line.meal_name || '—'}
                {line.is_variety_meal && line.variety_slot != null ? (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    (#{line.variety_slot})
                  </span>
                ) : null}
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>
                {line.category_name || (line.is_variety_meal ? '—' : 'Daily menu')}
              </td>
              <td style={{ textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ textAlign: 'right' }}>{formatInr(line.unit_price)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatInr(line.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BulkOrderOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    limit: PAGE_SIZE,
  });
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    adminBulkOrdersAPI
      .listVarietyCategories()
      .then((res) => setCategories(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminBulkOrdersAPI.listOrders(buildOrderQuery(filters));
      setOrders(Array.isArray(res?.data) ? res.data : []);
      setPagination({
        page: Number(res?.page ?? filters.page ?? 1),
        total: Number(res?.total ?? 0),
        limit: Number(res?.limit ?? PAGE_SIZE),
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => setFilters(defaultFilters);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Customer bulk orders</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Filter by date, tier, category, or search by phone, order ID, customer, meal, or category name.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={load}>
              Refresh
            </Button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 16,
            marginTop: 20,
          }}
        >
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Tier
            </label>
            <select
              value={filters.tier_mode}
              onChange={(e) => handleFilterChange('tier_mode', e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All tiers</option>
              <option value="under_threshold">Standard bulk (&lt;50)</option>
              <option value="at_or_above_threshold">Large event (50+)</option>
            </select>
          </div>

          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Category
            </label>
            <select
              value={filters.category_id}
              onChange={(e) => handleFilterChange('category_id', e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Date type
            </label>
            <select
              value={filters.date_field}
              onChange={(e) => handleFilterChange('date_field', e.target.value)}
              style={filterSelectStyle}
            >
              <option value="ordered">Ordered date</option>
              <option value="delivery">Delivery date</option>
            </select>
          </div>

          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              From date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              style={filterSelectStyle}
            />
          </div>

          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              To date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              style={filterSelectStyle}
            />
          </div>

          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-item" style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Phone, order ID, customer, address, city, meal, category, tier"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={filterSelectStyle}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        {!loading && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            {pagination.total} order{pagination.total === 1 ? '' : 's'} found
            {pagination.total > pagination.limit
              ? ` · page ${pagination.page} of ${totalPages}`
              : ''}
          </p>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No bulk orders found"
            description="Try adjusting filters or search terms"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((o) => {
              const tier = formatBulkTierMode(o.tier_mode);
              const statusKey = formatOrderStatus(o.status);
              const customer = o.client_name || o.client_username || '—';
              const cats = parseCategories(o.categories);

              return (
                <div
                  key={o.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{o.id}</span>
                        <Badge variant={tier.variant}>{tier.label}</Badge>
                        <Badge variant={ORDER_STATUS_COLORS[statusKey] || 'secondary'}>{statusKey}</Badge>
                      </div>
                      <p style={{ margin: 0, fontSize: 14 }}>
                        <strong>{customer}</strong>
                        {o.phone_number ? (
                          <span style={{ color: 'var(--text-secondary)' }}> · {o.phone_number}</span>
                        ) : null}
                      </p>
                      {cats.length > 0 ? (
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                          Categories: {cats.map((c) => c.name).filter(Boolean).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{formatInr(o.total_amount)}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {o.total_quantity} meal{o.total_quantity === 1 ? '' : 's'} total
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: 12,
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Ordered</span>
                      {formatBulkDateTime(o.created_at)}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Delivery</span>
                      {formatBulkDate(o.delivery_date)}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Type</span>
                      {tier.short === 'Standard'
                        ? 'School menu for delivery day (fixed bulk rate)'
                        : 'Variety catalog (per-meal price)'}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Delivery address</span>
                      {formatBulkDeliveryAddress(o)}
                    </div>
                  </div>

                  <OrderLineItems order={o} />
                </div>
              );
            })}
          </div>
        )}

        {!loading && pagination.total > pagination.limit ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginTop: 20,
            }}
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Page {pagination.page} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pagination.page >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
