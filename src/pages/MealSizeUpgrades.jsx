import { useCallback, useEffect, useState } from 'react';
import { adminMealSizeUpgradeAPI, adminMasterDataAPI } from '../services/api';
import { Button, EmptyState, Spinner, ConfirmDialog } from '../components/FormElements';
import { Input, Select } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

export default function MealSizeUpgrades() {
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [mealSizes, setMealSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ fromMealSizeId: '', toMealSizeId: '', price: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sizesRes, historyRes] = await Promise.all([
        adminMealSizeUpgradeAPI.getAll(),
        adminMasterDataAPI.getAllMealSizes(),
        adminMealSizeUpgradeAPI.getHistory(80),
      ]);
      setRows(listRes?.data ?? []);
      setHistory(historyRes?.data ?? []);
      setMealSizes(sizesRes?.data?.mealSizes ?? sizesRes?.data ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load upgrade prices');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ fromMealSizeId: '', toMealSizeId: '', price: '' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fromId = Number(form.fromMealSizeId);
    const toId = Number(form.toMealSizeId);
    const price = Number(form.price);
    if (!Number.isFinite(fromId) || !Number.isFinite(toId)) {
      toast.error('Select from and to meal sizes');
      return;
    }
    if (fromId === toId) {
      toast.error('From and to sizes must differ');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      await adminMealSizeUpgradeAPI.upsert({
        fromMealSizeId: fromId,
        toMealSizeId: toId,
        price,
        is_active: true,
      });
      toast.success('Upgrade price saved');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await adminMealSizeUpgradeAPI.delete(deleteTarget.id);
      toast.success('Deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meal size upgrades</h1>
          <p className="page-subtitle">
            One-time fees when a subscriber moves from one meal size to another (mobile app + PhonePe).
          </p>
          <p className="page-subtitle" style={{ marginTop: 8, fontSize: 13 }}>
            Users only see upgrades you publish from their <strong>current</strong> size. Add every pair you need
            (e.g. Small→Medium, Small→Large, Medium→Large) so skip-tier upgrades appear in the app.
          </p>
        </div>
        <Button onClick={openCreate}>Add upgrade price</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No upgrade prices" description="Add at least one from → to price pair." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Price (₹)</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.from_display_name || row.from_meal_size_id}</td>
                  <td>{row.to_display_name || row.to_meal_size_id}</td>
                  <td>{row.price}</td>
                  <td>{row.is_active ? 'Yes' : 'No'}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} style={{ color: 'var(--danger)' }}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="page-title" style={{ marginTop: 40, fontSize: '1.15rem' }}>Completed upgrades</h2>
      <p className="page-subtitle" style={{ marginBottom: 12 }}>
        Paid meal-size bumps — token printing uses the updated profile size after payment.
      </p>
      {history.length === 0 ? (
        <EmptyState title="No upgrades yet" description="Completed upgrade payments will appear here." />
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 24 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Client</th>
                <th>Recipient</th>
                <th>From → To</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.order_id}>
                  <td>{h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td>
                  <td>{h.client_name || h.client_id}</td>
                  <td>{h.entity_name || h.entity_id}</td>
                  <td>
                    {(h.from_display_name || h.from_meal_size_id) ?? '—'} → {(h.to_display_name || h.to_meal_size_id) ?? '—'}
                  </td>
                  <td>₹{h.amount_paid}</td>
                  <td>{h.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add upgrade price" size="sm">
        <form onSubmit={handleSave}>
          <Select
            label="From meal size"
            required
            value={form.fromMealSizeId}
            onChange={(e) => setForm((p) => ({ ...p, fromMealSizeId: e.target.value }))}
          >
            <option value="">Select</option>
            {mealSizes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name || m.name}
              </option>
            ))}
          </Select>
          <Select
            label="To meal size"
            required
            value={form.toMealSizeId}
            onChange={(e) => setForm((p) => ({ ...p, toMealSizeId: e.target.value }))}
            style={{ marginTop: 12 }}
          >
            <option value="">Select</option>
            {mealSizes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name || m.name}
              </option>
            ))}
          </Select>
          <Input
            label="Price (₹)"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            style={{ marginTop: 12 }}
          />
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete upgrade price"
        message={`Remove ${deleteTarget?.from_display_name} → ${deleteTarget?.to_display_name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
