import { useState, useEffect, useCallback, useRef } from 'react';
import { adminBulkOrdersAPI } from '../services/api';
import { Button, Spinner, Input, Badge } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const ORDER_STATUS_COLORS = {
  completed: 'success',
  confirmed: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'secondary',
};

const formatOrderStatus = (status) => {
  const s = String(status ?? '').trim().toLowerCase();
  if (s === 'confirmed') return 'completed';
  return s || '—';
};

const defaultConfig = {
  min_quantity: '10',
  min_lead_days: '3',
  tier_threshold: '50',
  price_per_meal_under_threshold: '0',
  variety_menu_lookahead_days: '14',
  max_variety_types: '5',
  allow_multiple_variety_meals: true,
  min_quantity_per_variety_meal: '1',
  is_active: true,
};

export default function BulkOrders() {
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingVariety, setSavingVariety] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [config, setConfig] = useState(defaultConfig);
  const [varietyMeals, setVarietyMeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [mealEdit, setMealEdit] = useState(null);
  const [mealName, setMealName] = useState('');
  const [mealPrice, setMealPrice] = useState('');
  const [mealActive, setMealActive] = useState(true);
  const [mealMinQty, setMealMinQty] = useState('1');
  const [mealPreview, setMealPreview] = useState('');
  const [mealFile, setMealFile] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, mealsRes, ordersRes] = await Promise.all([
        adminBulkOrdersAPI.getConfig(),
        adminBulkOrdersAPI.listVarietyMeals(),
        adminBulkOrdersAPI.listOrders({ page: 1, limit: 15 }),
      ]);
      const cfg = cfgRes?.data || {};
      setConfig({
        min_quantity: String(cfg.min_quantity ?? 10),
        min_lead_days: String(cfg.min_lead_days ?? 3),
        tier_threshold: String(cfg.tier_threshold ?? 50),
        price_per_meal_under_threshold: String(cfg.price_per_meal_under_threshold ?? 0),
        variety_menu_lookahead_days: String(cfg.variety_menu_lookahead_days ?? 14),
        max_variety_types: String(cfg.max_variety_types ?? 5),
        allow_multiple_variety_meals: cfg.allow_multiple_variety_meals !== false,
        min_quantity_per_variety_meal: String(cfg.min_quantity_per_variety_meal ?? 1),
        is_active: cfg.is_active !== false,
      });
      setVarietyMeals(Array.isArray(mealsRes?.data) ? mealsRes.data : []);
      setOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load bulk order settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveVarietyRules = async (e) => {
    e.preventDefault();
    setSavingVariety(true);
    try {
      await adminBulkOrdersAPI.updateConfig({
        max_variety_types: Number(config.max_variety_types),
        allow_multiple_variety_meals: config.allow_multiple_variety_meals,
      });
      toast.success('Variety rules saved');
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingVariety(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await adminBulkOrdersAPI.updateConfig({
        min_quantity: Number(config.min_quantity),
        min_lead_days: Number(config.min_lead_days),
        tier_threshold: Number(config.tier_threshold),
        price_per_meal_under_threshold: Number(config.price_per_meal_under_threshold),
        variety_menu_lookahead_days: Number(config.variety_menu_lookahead_days),
        is_active: config.is_active,
      });
      toast.success('Bulk order rules saved');
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingConfig(false);
    }
  };

  const openMealModal = (meal = null) => {
    setMealEdit(meal);
    setMealName(meal?.name || '');
    setMealPrice(meal?.price_per_meal != null ? String(meal.price_per_meal) : '');
    setMealActive(meal?.is_active !== false);
    setMealMinQty(String(meal?.min_order_quantity ?? 1));
    setMealPreview(meal?.image_url || '');
    setMealFile(null);
    setMealModalOpen(true);
  };

  const handleMealFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMealFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setMealPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveMeal = async (e) => {
    e.preventDefault();
    if (!mealEdit && !mealFile) {
      toast.warning('Please select a meal image');
      return;
    }
    if (!mealName.trim()) {
      toast.warning('Meal name is required');
      return;
    }
    if (mealPrice === '' || Number(mealPrice) < 0) {
      toast.warning('Valid price per meal is required');
      return;
    }
    setSavingMeal(true);
    try {
      const fd = new FormData();
      if (mealFile) fd.append('image', mealFile);
      fd.append('name', mealName.trim());
      fd.append('price_per_meal', mealPrice);
      fd.append('min_order_quantity', mealMinQty);
      fd.append('is_active', mealActive);
      if (mealEdit) {
        await adminBulkOrdersAPI.updateVarietyMeal(mealEdit.id, fd);
        toast.success('Bulk meal updated');
      } else {
        await adminBulkOrdersAPI.createVarietyMeal(fd);
        toast.success('Bulk meal added');
      }
      setMealModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (id) => {
    if (!window.confirm('Delete this bulk meal?')) return;
    try {
      await adminBulkOrdersAPI.deleteVarietyMeal(id);
      toast.success('Bulk meal deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const f = (key) => ({
    value: config[key],
    onChange: (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setConfig((p) => ({ ...p, [key]: val }));
    },
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const threshold = Number(config.tier_threshold) || 50;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Orders</h1>
          <p className="page-subtitle">
            Orders below {threshold} use the <strong>daily menu</strong> (Menu page) for the delivery date.
            Orders of {threshold}+ use the <strong>bulk meals</strong> you upload below (separate images and prices).
            Homepage card entity name: <strong>bulk</strong>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Rules and pricing (under {threshold} meals)</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          <Input label="Minimum quantity" type="number" min="1" required {...f('min_quantity')} />
          <Input label="Lead time (days before delivery)" type="number" min="0" required {...f('min_lead_days')} />
          <Input label={`${threshold}+ tier threshold`} type="number" min="2" required {...f('tier_threshold')} />
          <Input
            label={`Price per meal (under ${threshold})`}
            type="number"
            min="0"
            step="0.01"
            required
            {...f('price_per_meal_under_threshold')}
          />
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input id="bulk-active" type="checkbox" checked={config.is_active} {...f('is_active')} />
          <label htmlFor="bulk-active">Bulk ordering enabled</label>
        </div>
        <div style={{ marginTop: 24 }}>
          <Button type="submit" loading={savingConfig}>
            Save rules
          </Button>
        </div>
      </form>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Bulk meals ({threshold}+ orders)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Upload meal image, name, and price. Set min portions per meal in the add/edit form.
            </p>
          </div>
          <Button type="button" onClick={() => openMealModal()}>
            Add bulk meal
          </Button>
        </div>

        <form
          onSubmit={handleSaveVarietyRules}
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-muted)',
          }}
        >
          <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>Variety rules ({threshold}+ orders)</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
            Global settings when customers order multiple bulk meals. Applies to every {threshold}+ order.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {config.allow_multiple_variety_meals && (
              <Input
                label="Max different meal types"
                type="number"
                min="2"
                max="20"
                required
                {...f('max_variety_types')}
              />
            )}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="bulk-allow-multiple"
              type="checkbox"
              checked={config.allow_multiple_variety_meals}
              {...f('allow_multiple_variety_meals')}
            />
            <label htmlFor="bulk-allow-multiple" style={{ fontSize: 13 }}>
              Allow multiple different meals per order
            </label>
          </div>
          {!config.allow_multiple_variety_meals && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              Customers pick one bulk meal only; all portions go to that meal.
            </p>
          )}
          <div style={{ marginTop: 16 }}>
            <Button type="submit" loading={savingVariety} size="sm">
              Save variety rules
            </Button>
          </div>
        </form>

        {varietyMeals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>No bulk meals yet. Add your first meal above.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            {varietyMeals.map((m) => (
              <div
                key={m.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: m.is_active ? 1 : 0.55,
                }}
              >
                {m.image_url ? (
                  <div
                    style={{
                      width: '100%',
                      minHeight: 140,
                      maxHeight: 220,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-muted)',
                    }}
                  >
                    <img
                      src={m.image_url}
                      alt=""
                      style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div style={{ height: 140, background: 'var(--bg-muted)' }} />
                )}
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    ₹{Number(m.price_per_meal).toFixed(2)} / meal
                  </div>
                  {Number(m.min_order_quantity ?? 1) > 1 && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                      Min {Number(m.min_order_quantity)} portions when ordering multiple meals
                    </div>
                  )}
                  {!m.is_active && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inactive</span>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button type="button" size="sm" variant="ghost" onClick={() => openMealModal(m)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteMeal(m.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={mealModalOpen} onClose={() => setMealModalOpen(false)} title={mealEdit ? 'Edit bulk meal' : 'Add bulk meal'}>
        <form onSubmit={handleSaveMeal}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Meal image</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleMealFile} style={{ display: 'none' }} />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              {mealFile || mealEdit ? 'Change image' : 'Choose image'}
            </Button>
            {mealPreview && (
              <div
                style={{
                  marginTop: 12,
                  padding: 8,
                  borderRadius: 8,
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 120,
                  maxHeight: 280,
                }}
              >
                <img
                  src={mealPreview}
                  alt=""
                  style={{ display: 'block', maxWidth: '100%', maxHeight: 260, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
          <Input label="Meal name" value={mealName} onChange={(e) => setMealName(e.target.value)} required />
          <div style={{ marginTop: 12 }}>
            <Input
              label="Price per meal (₹)"
              type="number"
              min="0"
              step="0.01"
              value={mealPrice}
              onChange={(e) => setMealPrice(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Input
              label="Min portions for this meal (when ordering multiple meals)"
              type="number"
              min="1"
              max="5000"
              required
              disabled={!config.allow_multiple_variety_meals}
              value={mealMinQty}
              onChange={(e) => setMealMinQty(e.target.value)}
            />
            {!config.allow_multiple_variety_meals && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                Enable &quot;Allow multiple different meals&quot; on the page to set a per-meal minimum.
              </p>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="meal-active"
              type="checkbox"
              checked={mealActive}
              onChange={(e) => setMealActive(e.target.checked)}
            />
            <label htmlFor="meal-active">Active (visible to customers)</label>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setMealModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingMeal}>
              {mealEdit ? 'Update' : 'Add meal'}
            </Button>
          </div>
        </form>
      </Modal>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Recent bulk orders</h3>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No bulk orders yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((o) => {
              const items = Array.isArray(o.items) ? o.items : [];
              const tierLabel =
                o.tier_mode === 'at_or_above_threshold'
                  ? `${threshold}+ Variety`
                  : `Under ${threshold} (Daily Menu)`;
              const tierColor =
                o.tier_mode === 'at_or_above_threshold' ? '#7c3aed' : '#0369a1';
              const statusDisplay = formatOrderStatus(o.status);
              return (
                <div
                  key={o.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  {/* Order header */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      alignItems: 'center',
                      padding: '14px 18px',
                      background: 'var(--bg-muted)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <strong style={{ fontSize: 15 }}>{o.id}</strong>
                    <Badge variant={ORDER_STATUS_COLORS[statusDisplay] || 'secondary'}>
                      {statusDisplay}
                    </Badge>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: tierColor,
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    >
                      {tierLabel}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {o.delivery_date
                        ? new Date(o.delivery_date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>

                  {/* Order body */}
                  <div style={{ padding: '14px 18px' }}>
                    {/* Customer info row */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 20,
                        marginBottom: 14,
                        fontSize: 14,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>
                        <strong>Customer:</strong>{' '}
                        {o.client_name || o.client_username || '—'}
                      </span>
                      <span>
                        <strong>Phone:</strong> {o.phone_number || '—'}
                      </span>
                      <span>
                        <strong>Total Meals:</strong> {o.total_quantity}
                      </span>
                      <span>
                        <strong>Total:</strong>{' '}
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Meal items breakdown */}
                    {items.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table
                          className="data-table"
                          style={{ fontSize: 13, marginBottom: 0 }}
                        >
                          <thead>
                            <tr>
                              <th style={{ minWidth: 160 }}>Meal</th>
                              <th>Type</th>
                              <th style={{ textAlign: 'right' }}>Qty</th>
                              <th style={{ textAlign: 'right' }}>Price/Meal</th>
                              <th style={{ textAlign: 'right' }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td style={{ fontWeight: 500 }}>
                                  {item.meal_name || 'Unknown'}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: '2px 6px',
                                      borderRadius: 8,
                                      background: item.is_variety_meal
                                        ? '#f3e8ff'
                                        : '#e0f2fe',
                                      color: item.is_variety_meal
                                        ? '#7c3aed'
                                        : '#0369a1',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {item.is_variety_meal
                                      ? 'Variety Meal'
                                      : 'Daily Menu'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {item.quantity}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  ₹{Number(item.unit_price).toFixed(2)}
                                </td>
                                <td
                                  style={{
                                    textAlign: 'right',
                                    fontWeight: 600,
                                  }}
                                >
                                  ₹{Number(item.line_total).toLocaleString(
                                    'en-IN'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td
                                colSpan={2}
                                style={{ fontWeight: 700, fontSize: 14 }}
                              >
                                Total
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  fontSize: 14,
                                }}
                              >
                                {o.total_quantity}
                              </td>
                              <td />
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  fontSize: 14,
                                }}
                              >
                                ₹{Number(o.total_amount).toLocaleString(
                                  'en-IN'
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        No meal breakdown available.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

