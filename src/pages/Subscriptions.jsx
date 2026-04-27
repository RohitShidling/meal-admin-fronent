import { useState, useEffect, useCallback } from 'react';
import { adminSubscriptionsAPI, commonAPI } from '../services/api';
import { Button, EmptyState, Spinner, Badge, ConfirmDialog } from '../components/FormElements';
import { Input, Select } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

// Backend fields: plan_name*, price*, billing_cycle*, trial_days, display_order, is_active
// billing_cycle values: daily | weekly | monthly | quarterly | yearly
const INITIAL_FORM = {
  plan_name: '',
  price: '',
  billing_cycle: 'monthly',
  trial_days: '0',
  display_order: '1',
  is_active: true,
};

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      // Response: { success, count, data: [] }  — flat array of rows
      const res = await commonAPI.getSubscriptions();
      setSubscriptions(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load subscriptions');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (sub) => {
    setEditTarget(sub);
    setForm({
      plan_name: sub.plan_name || '',
      price: sub.price?.toString() || '',
      billing_cycle: sub.billing_cycle || 'monthly',
      trial_days: sub.trial_days?.toString() || '0',
      display_order: sub.display_order?.toString() || '1',
      is_active: sub.is_active ?? true,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.plan_name.trim()) e.plan_name = 'Plan name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Valid price required';
    if (!form.billing_cycle) e.billing_cycle = 'Billing cycle is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      plan_name: form.plan_name,
      price: Number(form.price),
      billing_cycle: form.billing_cycle,
      trial_days: Number(form.trial_days) || 0,
      display_order: Number(form.display_order) || 1,
      is_active: form.is_active,
    };
    try {
      if (editTarget) {
        await adminSubscriptionsAPI.update(editTarget.id, payload);
        toast.success('Subscription updated');
      } else {
        await adminSubscriptionsAPI.create(payload);
        toast.success('Subscription created');
      }
      setModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminSubscriptionsAPI.delete(deleteTarget.id);
      toast.success('Subscription deleted');
      setDeleteTarget(null);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  const cycleLabel = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage meal subscription plans</p>
        </div>
        <Button icon={<PlusIcon />} onClick={openCreate} id="add-subscription-btn">Add Plan</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : subscriptions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<SubSVG />}
            title="No subscription plans"
            description="Create your first subscription plan"
            action={<Button onClick={openCreate} icon={<PlusIcon />}>Add Plan</Button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{sub.plan_name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Order #{sub.display_order}</p>
                </div>
                <Badge variant={sub.is_active ? 'success' : 'default'}>{sub.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent-primary)' }}>
                  ₹{Number(sub.price).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  / {cycleLabel[sub.billing_cycle] || sub.billing_cycle}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge variant="accent">{sub.billing_cycle}</Badge>
                {sub.trial_days > 0 && (
                  <Badge variant="info">{sub.trial_days} day trial</Badge>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <Button variant="secondary" size="sm" icon={<EditIcon />} onClick={() => openEdit(sub)} id={`edit-sub-${sub.id}`}>Edit</Button>
                <Button variant="ghost" size="sm" icon={<TrashIcon />} onClick={() => setDeleteTarget(sub)} id={`delete-sub-${sub.id}`} style={{ color: 'var(--danger)' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Subscription' : 'New Subscription Plan'} size="md">
        <form onSubmit={handleSave} id="subscription-form">
          <Input
            id="sub-plan-name"
            label="Plan Name"
            placeholder="e.g. Monthly Lunch Plan"
            error={errors.plan_name}
            required
            {...f('plan_name')}
          />
          <div className="form-row form-row-2" style={{ marginTop: 16 }}>
            <Input
              id="sub-price"
              label="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              placeholder="499"
              error={errors.price}
              required
              {...f('price')}
            />
            <Select id="sub-billing-cycle" label="Billing Cycle" error={errors.billing_cycle} required {...f('billing_cycle')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <div className="form-row form-row-2" style={{ marginTop: 16 }}>
            <Input
              id="sub-trial-days"
              label="Trial Days"
              type="number"
              min="0"
              placeholder="0"
              hint="0 means no trial"
              {...f('trial_days')}
            />
            <Input
              id="sub-display-order"
              label="Display Order"
              type="number"
              min="1"
              placeholder="1"
              {...f('display_order')}
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="sub-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="sub-active" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Active (visible to clients)
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} id="sub-save-btn">
              {editTarget ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Subscription"
        message={`Are you sure you want to delete "${deleteTarget?.plan_name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const SubSVG = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
