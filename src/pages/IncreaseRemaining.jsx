import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminMealsAPI } from '../services/api';
import { Badge, Button, EmptyState, Input, Select, Spinner } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'child', label: 'Child' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'professional', label: 'Professional' },
];

const LIMIT_OPTIONS = ['20', '50', '100', '200'];

function getPageItems(totalPages, currentPage) {
  const tp = Math.max(1, Number(totalPages || 1));
  const cp = Math.min(Math.max(1, Number(currentPage || 1)), tp);
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);

  const items = new Set([1, tp, cp]);
  if (cp - 1 > 1) items.add(cp - 1);
  if (cp + 1 < tp) items.add(cp + 1);
  if (cp - 2 > 1) items.add(cp - 2);
  if (cp + 2 < tp) items.add(cp + 2);

  const sorted = Array.from(items).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const v = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && v - prev > 1) out.push('…');
    out.push(v);
  }
  return out;
}

export default function IncreaseRemainingPage() {
  const [filters, setFilters] = useState({ role: '', q: '', activeOnly: 'true', page: 1, limit: 20 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ mealsToAdd: '', reason: '' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminMealsAPI.getUsers({
        role: filters.role || undefined,
        q: filters.q.trim() || undefined,
        activeOnly: filters.activeOnly,
        page: filters.page,
        limit: filters.limit,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setPagination({
        total: Number(res?.pagination?.total || 0),
        page: Number(res?.pagination?.page || filters.page),
        limit: Number(res?.pagination?.limit || filters.limit),
      });
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 1)));

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.totalMeals += Number(row.total_meals || 0);
        acc.usedMeals += Number(row.used_meals || 0);
        acc.remainingMeals += Number(row.remaining_meals || 0);
        return acc;
      },
      { totalMeals: 0, usedMeals: 0, remainingMeals: 0 }
    );
  }, [rows]);

  const openAddMealsModal = (row) => {
    setSelectedUser(row);
    setForm({ mealsToAdd: '', reason: '' });
    setModalOpen(true);
  };

  const submitAddMeals = async (e) => {
    e.preventDefault();
    const mealsToAdd = Number(form.mealsToAdd);
    if (!Number.isInteger(mealsToAdd) || mealsToAdd <= 0) {
      toast.error('Meals to add must be a positive integer');
      return;
    }
    if (!selectedUser?.role || !selectedUser?.entity_id) {
      toast.error('Selected user details are invalid');
      return;
    }

    setSaving(true);
    try {
      await adminMealsAPI.addRemainingMeals(selectedUser.role, selectedUser.entity_id, {
        mealsToAdd,
        reason: form.reason.trim() || undefined,
      });
      toast.success('Extra meals added successfully');
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to add remaining meals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Increase Remaining</h1>
          <p className="page-subtitle">View users/candidates with remaining meals and add extra meals to specific subscriptions.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <Input
            label="Search"
            placeholder="Name, phone, plan, entity, or subscription id"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
          />
          <Select
            label="Role"
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value, page: 1 }))}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select
            label="Active status"
            value={filters.activeOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, activeOnly: e.target.value, page: 1 }))}
          >
            <option value="true">Active only</option>
            <option value="false">All users</option>
          </Select>
          <Select
            label="Rows"
            value={String(filters.limit)}
            onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
          >
            {LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={loadUsers} disabled={loading} style={{ height: 38 }}>
            Refresh
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card"><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Users on this page</div><div style={{ fontSize: 24, fontWeight: 700 }}>{rows.length}</div></div>
        <div className="card"><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total meals</div><div style={{ fontSize: 24, fontWeight: 700 }}>{totals.totalMeals}</div></div>
        <div className="card"><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Used meals</div><div style={{ fontSize: 24, fontWeight: 700 }}>{totals.usedMeals}</div></div>
        <div className="card"><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Remaining meals</div><div style={{ fontSize: 24, fontWeight: 700 }}>{totals.remainingMeals}</div></div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : error ? (
        <div className="card">
          <EmptyState title="Failed to load meal users" description={error} action={<Button onClick={loadUsers}>Retry</Button>} />
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState title="No users found" description="No records match your current filters." />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subscription ID</th>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Entity ID</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Used</th>
                  <th>Remaining</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.role}-${row.entity_id}-${row.subscription_id}`}>
                    <td>{row.subscription_id || '—'}</td>
                    <td>{row.user_name || '—'}</td>
                    <td>{row.phone_number || row.phone || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{row.role || '—'}</td>
                    <td>{row.entity_id || '—'}</td>
                    <td>
                      <Badge variant={row.is_active ? 'success' : 'default'}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{row.total_meals ?? 0}</td>
                    <td>{row.used_meals ?? 0}</td>
                    <td><strong>{row.remaining_meals ?? 0}</strong></td>
                    <td>
                      <Button size="sm" onClick={() => openAddMealsModal(row)}>Add Remaining</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Showing page {pagination.page} of {totalPages} ({pagination.total} users)
            </div>
            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: 0 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <div className="pagination-pages">
                  {getPageItems(totalPages, pagination.page).map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="page-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`page-num ${item === pagination.page ? 'page-num-active' : ''}`}
                        onClick={() => setFilters((prev) => ({ ...prev, page: item }))}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                  disabled={pagination.page >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Remaining Meals" size="sm">
        <form onSubmit={submitAddMeals}>
          <Input label="User" value={selectedUser?.user_name || ''} disabled />
          <Input label="Entity" value={`${selectedUser?.role || ''} / ${selectedUser?.entity_id || ''}`} disabled style={{ marginTop: 12 }} />
          <Input
            label="Meals to Add"
            type="number"
            min="1"
            step="1"
            required
            value={form.mealsToAdd}
            onChange={(e) => setForm((prev) => ({ ...prev, mealsToAdd: e.target.value }))}
            style={{ marginTop: 12 }}
          />
          <Input
            label="Reason"
            placeholder="Optional reason"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            style={{ marginTop: 12 }}
          />
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Meals</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
