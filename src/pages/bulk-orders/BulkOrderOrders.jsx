import { useState, useEffect, useCallback } from 'react';
import { adminBulkOrdersAPI } from '../../services/api';
import { Button, Spinner, Badge } from '../../components/FormElements';
import { toast } from '../../components/Toast';
import {
  ORDER_STATUS_COLORS,
  formatOrderStatus,
  formatBulkTierMode,
  formatInr,
  formatBulkDate,
  formatBulkDateTime,
  parseOrderItems,
} from './shared';

function OrderLineItems({ order }) {
  const items = parseOrderItems(order.items);
  const tier = formatBulkTierMode(order.tier_mode);

  if (items.length === 0) {
    return <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No line items recorded.</p>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {tier.short === 'Standard' ? 'Meal (delivery day menu)' : 'Meals ordered'}
      </p>
      <table className="data-table" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>Meal</th>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminBulkOrdersAPI.listOrders({ page: 1, limit: 50 });
      setOrders(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Customer bulk orders</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Standard bulk uses the school menu for the delivery date (under 50 meals). Large event bulk lists
            variety catalog meals with per-meal pricing (50+ meals).
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No bulk orders yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((o) => {
            const tier = formatBulkTierMode(o.tier_mode);
            const statusKey = formatOrderStatus(o.status);
            const customer = o.client_name || o.client_username || '—';

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
                </div>

                <OrderLineItems order={o} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
