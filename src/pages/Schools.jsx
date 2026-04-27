import { useState, useEffect, useCallback } from 'react';
import { adminSchoolsAPI } from '../services/api';
import { Button, EmptyState, Spinner, Badge, ConfirmDialog } from '../components/FormElements';
import { Input, Select } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

// Backend fields: name*, address*, city*, state*, pincode*, country, is_active
const INITIAL_FORM = { name: '', address: '', city: '', state: '', pincode: '', country: 'India', is_active: true };

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 10;

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSchoolsAPI.getAll({ page, limit, search });
      // Response: { data: { schools: [], pagination: { currentPage, totalPages, totalItems, itemsPerPage } } }
      setSchools(res?.data?.schools ?? []);
      setPagination(res?.data?.pagination ?? { totalItems: 0, totalPages: 1 });
    } catch (err) {
      toast.error(err.message || 'Failed to load schools');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (school) => {
    setEditTarget(school);
    setForm({
      name: school.name || '',
      address: school.address || '',
      city: school.city || '',
      state: school.state || '',
      pincode: school.pincode || '',
      country: school.country || 'India',
      is_active: school.is_active ?? true,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'School name is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!form.pincode.trim()) e.pincode = 'Pincode is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await adminSchoolsAPI.update(editTarget.id, form);
        toast.success('School updated');
      } else {
        await adminSchoolsAPI.create(form);
        toast.success('School created');
      }
      setModalOpen(false);
      fetchSchools();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminSchoolsAPI.delete(deleteTarget.id);
      toast.success('School deleted');
      setDeleteTarget(null);
      fetchSchools();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Schools</h1>
          <p className="page-subtitle">Manage school records</p>
        </div>
        <Button icon={<PlusIcon />} onClick={openCreate} id="add-school-btn">Add School</Button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="search-input-wrap" style={{ flex: 1, maxWidth: 340 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              id="schools-search"
              placeholder="Search by name or city..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {pagination.totalItems} total
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="lg" /></div>
        ) : schools.length === 0 ? (
          <EmptyState
            icon={<SchoolSVG />}
            title="No schools found"
            description="Create your first school to get started"
            action={<Button onClick={openCreate} icon={<PlusIcon />}>Add School</Button>}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Pincode</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      {s.address && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.address}</div>}
                    </td>
                    <td>{s.city || '—'}</td>
                    <td>{s.state || '—'}</td>
                    <td>{s.pincode || '—'}</td>
                    <td>{s.country || 'India'}</td>
                    <td>
                      <Badge variant={s.is_active ? 'success' : 'default'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(s)} id={`edit-school-${s.id}`}>
                          <EditIcon />
                        </button>
                        <button className="icon-btn icon-btn-danger" title="Delete" onClick={() => setDeleteTarget(s)} id={`delete-school-${s.id}`}>
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="page-info">Page {page} of {pagination.totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit School' : 'Add School'} size="lg">
        <form onSubmit={handleSave} id="school-form">
          <div className="form-row form-row-2">
            <Input id="school-name" label="School Name" placeholder="e.g. Greenwood High School" error={errors.name} required {...f('name')} />
            <Input id="school-country" label="Country" placeholder="India" {...f('country')} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Input id="school-address" label="Address" placeholder="Full address" error={errors.address} required {...f('address')} />
          </div>
          <div className="form-row form-row-3" style={{ marginTop: 16 }}>
            <Input id="school-city" label="City" placeholder="City" error={errors.city} required {...f('city')} />
            <Input id="school-state" label="State" placeholder="State" error={errors.state} required {...f('state')} />
            <Input id="school-pincode" label="Pincode" placeholder="560001" error={errors.pincode} required {...f('pincode')} />
          </div>
          {editTarget && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="school-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
              />
              <label htmlFor="school-active" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                Active
              </label>
            </div>
          )}
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} id="school-save-btn">
              {editTarget ? 'Update School' : 'Create School'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete School"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
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
const SchoolSVG = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
