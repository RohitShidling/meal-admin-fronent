import { useState, useEffect, useCallback } from 'react';
import { adminCorporateAPI, commonAPI } from '../services/api';
import { Button, EmptyState, Spinner, Badge } from '../components/FormElements';
import { Input } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

// Backend required: name*, address*, city*, state*    Optional: is_active
const INITIAL_FORM = { name: '', address: '', city: '', state: '', is_active: true };

export default function CorporateLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      // Response: { success, count, data: [{ id, name, address, city, state }] }
      const res = await commonAPI.getCorporateLocations();
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load locations');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

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
    try {
      await adminCorporateAPI.create({
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        is_active: form.is_active,
      });
      toast.success('Location created');
      setModalOpen(false);
      setForm(INITIAL_FORM);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Failed to create location');
    } finally { setSaving(false); }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Corporate Locations</h1>
          <p className="page-subtitle">Manage corporate delivery destinations</p>
        </div>
        <Button icon={<PlusIcon />} onClick={() => { setForm(INITIAL_FORM); setErrors({}); setModalOpen(true); }} id="add-location-btn">
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
            action={<Button onClick={() => setModalOpen(true)} icon={<PlusIcon />}>Add Location</Button>}
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
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={loc.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                    <td><span style={{ fontWeight: 500 }}>{loc.name}</span></td>
                    <td style={{ maxWidth: 240 }}>
                      <span className="truncate" style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {loc.address || '—'}
                      </span>
                    </td>
                    <td>{loc.city || '—'}</td>
                    <td>{loc.state || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Corporate Location" size="md">
        <form onSubmit={handleSave} id="location-form">
          <Input id="loc-name" label="Location Name" placeholder="e.g. Infosys Campus Block A" error={errors.name} required {...f('name')} />
          <div style={{ marginTop: 16 }}>
            <Input id="loc-address" label="Address" placeholder="Full street address" error={errors.address} required {...f('address')} />
          </div>
          <div className="form-row form-row-2" style={{ marginTop: 16 }}>
            <Input id="loc-city" label="City" placeholder="City" error={errors.city} required {...f('city')} />
            <Input id="loc-state" label="State" placeholder="State" error={errors.state} required {...f('state')} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="loc-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="loc-active" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>Active</label>
          </div>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} id="location-save-btn">Create Location</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const PinSVG = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
