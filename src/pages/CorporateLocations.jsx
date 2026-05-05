import { useState, useEffect, useCallback } from 'react';
import { adminCorporateAPI, commonAPI } from '../services/api';
import { Button, EmptyState, Spinner, ConfirmDialog } from '../components/FormElements';
import { Input, Select } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const INITIAL_FORM = { name: '', address: '', city: '', state: '', is_active: true };

export default function CorporateLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);


  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');

  useEffect(() => {
    commonAPI.getStates().then(res => setStatesList(res?.data || []));
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      commonAPI.getCities(selectedStateId).then(res => setCitiesList(res?.data || []));
    } else {
      setCitiesList([]);
    }
  }, [selectedStateId]);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminCorporateAPI.getAll();
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load locations');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setSelectedStateId('');
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (loc) => {
    setEditTarget(loc);
    setForm({
      name: loc.name || '',
      address: loc.address || '',
      city: loc.city || '',
      state: loc.state || '',
      is_active: loc.is_active ?? true,
    });
    
    // Attempt to find the state ID from the state name so cities can load
    const st = statesList.find(s => s.name === loc.state);
    setSelectedStateId(st ? st.id : '');

    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Location name is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      address: form.address,
      city: form.city,
      state: form.state,
      is_active: form.is_active,
    };
    try {
      if (editTarget) {
        await adminCorporateAPI.update(editTarget.id, payload);
        toast.success('Location updated');
      } else {
        await adminCorporateAPI.create(payload);
        toast.success('Location created');
      }
      setModalOpen(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (loc) => {
    setStatusUpdatingId(loc.id);
    try {
      await adminCorporateAPI.setStatus(loc.id, !loc.is_active);
      toast.success(`Location ${!loc.is_active ? 'activated' : 'deactivated'}`);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminCorporateAPI.delete(deleteTarget.id);
      toast.success('Location deleted');
      setDeleteTarget(null);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };



  const f = (key) => ({ value: form[key], onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Corporate Locations</h1>
          <p className="page-subtitle">Manage corporate delivery destinations</p>
        </div>
        <Button icon={<PlusIcon />} onClick={openCreate} id="add-location-btn">
          Add Location
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : locations.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<PinSVG />}
            title="No corporate locations"
            description="Add your first corporate delivery location"
            action={<Button onClick={openCreate} icon={<PlusIcon />}>Add Location</Button>}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Location Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={loc.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                    <td><span style={{ fontWeight: 600 }}>{loc.name}</span></td>
                    <td style={{ maxWidth: 220 }}>
                      <span className="truncate" style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {loc.address || '—'}
                      </span>
                    </td>
                    <td>{loc.city || '—'}</td>
                    <td>{loc.state || '—'}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: loc.is_active ? '#dcfce7' : '#f1f5f9',
                          color: loc.is_active ? '#166534' : '#475569'
                        }}
                      >
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="icon-btn"
                          title={loc.is_active ? 'Set Inactive' : 'Set Active'}
                          onClick={() => handleToggleStatus(loc)}
                          disabled={statusUpdatingId === loc.id}
                        >
                          {statusUpdatingId === loc.id ? '...' : (loc.is_active ? 'Off' : 'On')}
                        </button>
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(loc)} id={`edit-loc-${loc.id}`}>
                          <EditIcon />
                        </button>
                        <button className="icon-btn icon-btn-danger" title="Delete" onClick={() => setDeleteTarget(loc)} id={`delete-loc-${loc.id}`}>
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Corporate Location' : 'Add Corporate Location'} size="md">
        <form onSubmit={handleSave} id="location-form">
          <Input id="loc-name" label="Location Name" placeholder="e.g. Infosys Campus Block A" error={errors.name} required {...f('name')} />
          <div style={{ marginTop: 16 }}>
            <Input id="loc-address" label="Address" placeholder="Full street address" error={errors.address} required {...f('address')} />
          </div>
          <div className="form-row form-row-2" style={{ marginTop: 16 }}>
            <Select
              id="loc-state"
              label="State"
              error={errors.state}
              required
              value={form.state}
              onChange={(e) => {
                const st = statesList.find(s => s.name === e.target.value);
                setSelectedStateId(st ? st.id : '');
                setForm(p => ({ ...p, state: e.target.value, city: '' }));
              }}
            >
              <option value="">Select State</option>
              {statesList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>

            <Select
              id="loc-city"
              label="City"
              error={errors.city}
              required
              disabled={!selectedStateId}
              {...f('city')}
            >
              <option value="">Select City</option>
              {citiesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="loc-active"
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="loc-active" style={{ fontSize: 14 }}>Active</label>
          </div>

          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} id="location-save-btn">
              {editTarget ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
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

const PinSVG = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
