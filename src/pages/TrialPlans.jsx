import { useState, useEffect, useCallback } from 'react';
import { adminTrialPlansAPI } from '../services/api';
import { Button, EmptyState, Spinner, Badge, ConfirmDialog } from '../components/FormElements';
import { Input, Select } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const INITIAL_FORM = {
  plan_name: '',
  price: '',
  duration_days: '7',
  is_active: true,
};

export default function TrialPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminTrialPlansAPI.getAll();
      setPlans(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load trial plans');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditTarget(plan);
    setForm({
      plan_name: plan.plan_name || '',
      price: plan.price?.toString() || '',
      duration_days: plan.duration_days?.toString() || '7',
      is_active: plan.is_active ?? true,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.plan_name.trim()) e.plan_name = 'Plan name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Valid price required';
    if (!form.duration_days || isNaN(Number(form.duration_days)) || Number(form.duration_days) <= 0) e.duration_days = 'Valid duration required';
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
      duration_days: Number(form.duration_days),
      is_active: form.is_active,
    };
    try {
      if (editTarget) {
        await adminTrialPlansAPI.update(editTarget.id, payload);
        toast.success('Trial plan updated');
      } else {
        await adminTrialPlansAPI.create(payload);
        toast.success('Trial plan created');
      }
      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminTrialPlansAPI.delete(deleteTarget.id);
      toast.success('Trial plan deleted');
      setDeleteTarget(null);
      fetchPlans();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const toggleStatus = async (plan) => {
    try {
      await adminTrialPlansAPI.setStatus(plan.id, !plan.is_active);
      toast.success(`Plan marked as ${!plan.is_active ? 'Active' : 'Inactive'}`);
      fetchPlans();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trial Plans</h1>
          <p className="page-subtitle">Manage trial subscription plans</p>
        </div>
        <Button icon={<PlusIcon />} onClick={openCreate} id="add-trial-btn">Add Trial Plan</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<SubSVG />}
            title="No trial plans"
            description="Create your first trial plan"
            action={<Button onClick={openCreate} icon={<PlusIcon />}>Add Trial Plan</Button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {plans.map((plan) => (
            <div key={plan.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{plan.plan_name}</h3>
                </div>
                <Badge variant={plan.is_active ? 'success' : 'default'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent-primary)' }}>
                  ₹{Number(plan.price).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  / {plan.duration_days} days
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <Button variant="secondary" size="sm" icon={<EditIcon />} onClick={() => openEdit(plan)}>Edit</Button>
                <Button variant={plan.is_active ? 'ghost' : 'primary'} size="sm" onClick={() => toggleStatus(plan)}>
                  {plan.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" size="sm" icon={<TrashIcon />} onClick={() => setDeleteTarget(plan)} style={{ color: 'var(--danger)', marginLeft: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Trial Plan' : 'New Trial Plan'} size="md">
        <form onSubmit={handleSave}>
          <Input
            label="Plan Name"
            placeholder="e.g. 7-Day Trial"
            error={errors.plan_name}
            required
            {...f('plan_name')}
          />
          <div className="form-row form-row-2" style={{ marginTop: 16 }}>
            <Input
              label="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              placeholder="99"
              error={errors.price}
              required
              {...f('price')}
            />
            <Input
              label="Duration (Days)"
              type="number"
              min="1"
              placeholder="7"
              error={errors.duration_days}
              required
              {...f('duration_days')}
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="trial-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="trial-active" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Active (visible to clients)
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>
              {editTarget ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Trial Plan"
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
