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
  formatBulkDeliveryAddress,
  parseOrderItems,
} from './shared';

/**
 * Shows today's and upcoming deliveries with completed/confirmed payment only.
 * Orders disappear from this tab the day after their delivery date, but stay in "Orders".
 */

function todayYmd() {
  const d = new Date();
  return d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');
}

function DeliveryLineItems({ order }) {
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

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  return d === todayYmd();
}

export default function BulkOrderDeliveries() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch confirmed/completed orders with delivery_date >= today
      const today = todayYmd();
      const res = await adminBulkOrdersAPI.listOrders({
        status: 'confirmed',
        date_field: 'delivery',
        start_date: today,
        limit: 100,
      });
      const data = Array.isArray(res?.data) ? res.data : [];
      // Sort: today first, then ascending by delivery date
      data.sort((a, b) => {
        const aDate = String(a.delivery_date ?? '').slice(0, 10);
        const bDate = String(b.delivery_date ?? '').slice(0, 10);
        return aDate.localeCompare(bDate);
      });
      setOrders(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group orders by delivery date
  const grouped = {};
  for (const o of orders) {
    const dateKey = String(o.delivery_date ?? '').slice(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(o);
  }
  const dateKeys = Object.keys(grouped).sort();

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Today &amp; Upcoming Deliveries</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Shows only paid (confirmed) bulk orders with delivery date today or in the future.
              Past deliveries automatically move out of this view.
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No upcoming deliveries"
          description="No confirmed bulk orders with delivery date today or later."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {dateKeys.map((dateKey) => {
            const dayOrders = grouped[dateKey];
            const isTodayDate = isToday(dateKey);
            const totalMeals = dayOrders.reduce((sum, o) => sum + (o.total_quantity || 0), 0);
            const totalAmount = dayOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 8,
                    borderBottom: '2px solid var(--border)',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {isTodayDate ? '📍 Today — ' : ''}
                    {formatBulkDate(dateKey)}
                  </h3>
                  {isTodayDate && (
                    <Badge variant="warning">Today</Badge>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {dayOrders.length} order{dayOrders.length !== 1 ? 's' : ''} · {totalMeals} meals · {formatInr(totalAmount)}
                  </span>
                </div>

                {/* Orders for this date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {dayOrders.map((o) => {
                    const tier = formatBulkTierMode(o.tier_mode);
                    const statusKey = formatOrderStatus(o.status);
                    const customer = o.client_name || o.client_username || '—';

                    return (
                      <div
                        key={o.id}
                        className="card"
                        style={{
                          padding: 16,
                          border: isTodayDate ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
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
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{formatInr(o.total_amount)}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              {o.total_quantity} meal{o.total_quantity === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: 10,
                            fontSize: 13,
                            marginBottom: 4,
                          }}
                        >
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Delivery</span>
                            {formatBulkDate(o.delivery_date)}
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Type</span>
                            {tier.short === 'Standard'
                              ? 'School menu (fixed rate)'
                              : 'Variety catalog (per-meal price)'}
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Delivery address</span>
                            {formatBulkDeliveryAddress(o)}
                          </div>
                        </div>

                        <DeliveryLineItems order={o} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
