import { useState, useEffect, useCallback } from 'react';
import { adminMasterDataAPI, commonAPI } from '../services/api';
import { Button, EmptyState, Spinner, ConfirmDialog } from '../components/FormElements';
import { Input, Select } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const TABS = ['States', 'Cities', 'Companies', 'Meal Sizes', 'Standards'];

function MasterData() {
  const [activeTab, setActiveTab] = useState('States');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Parent dependencies for dropdowns
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'States') {
        const res = await adminMasterDataAPI.getAllStates();
        setData(res?.data ?? []);
      } else if (activeTab === 'Cities') {
        const res = await adminMasterDataAPI.getAllCities();
        setData(res?.data ?? []);
      } else if (activeTab === 'Companies') {
        const res = await adminMasterDataAPI.getAllCompanies();
        setData(res?.data ?? []);
      } else if (activeTab === 'Meal Sizes') {
        const res = await adminMasterDataAPI.getAllMealSizes();
        setData(res?.data?.mealSizes ?? []);
      } else if (activeTab === 'Standards') {
        const res = await adminMasterDataAPI.getAllStandards();
        setData(res?.data?.standards ?? []);
      }
    } catch (err) {
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'Cities' || activeTab === 'Companies') {
      commonAPI.getStates().then(res => setStatesList(res?.data ?? []));
    }
    if (activeTab === 'Companies') {
      commonAPI.getCities().then(res => setCitiesList(res?.data ?? []));
    }
  }, [fetchData, activeTab]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ isActive: true });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      name: item.name || '',
      displayName: item.display_name || '',
      sortOrder: item.sort_order?.toString() || '0',
      stateId: item.state_id?.toString() || '',
      cityId: item.city_id?.toString() || '',
      isActive: item.is_active ?? true,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, isActive: form.isActive };
      
      if (activeTab === 'Cities') payload.stateId = Number(form.stateId);
      if (activeTab === 'Companies') payload.cityId = Number(form.cityId) || null;
      if (activeTab === 'Meal Sizes') {
        payload.displayName = form.displayName;
        payload.sortOrder = Number(form.sortOrder);
      }

      if (editTarget) {
        if (activeTab === 'States') await adminMasterDataAPI.updateState(editTarget.id, payload);
        if (activeTab === 'Cities') await adminMasterDataAPI.updateCity(editTarget.id, payload);
        if (activeTab === 'Companies') await adminMasterDataAPI.updateCompany(editTarget.id, payload);
        if (activeTab === 'Meal Sizes') await adminMasterDataAPI.updateMealSize(editTarget.id, payload);
        toast.success('Updated successfully');
      } else {
        if (activeTab === 'States') await adminMasterDataAPI.createState(payload);
        if (activeTab === 'Cities') await adminMasterDataAPI.createCity(payload);
        if (activeTab === 'Companies') await adminMasterDataAPI.createCompany(payload);
        if (activeTab === 'Meal Sizes') await adminMasterDataAPI.createMealSize(payload);
        toast.success('Created successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (activeTab === 'States') await adminMasterDataAPI.deleteState(deleteTarget.id);
      if (activeTab === 'Cities') await adminMasterDataAPI.deleteCity(deleteTarget.id);
      if (activeTab === 'Companies') await adminMasterDataAPI.deleteCompany(deleteTarget.id);
      if (activeTab === 'Meal Sizes') await adminMasterDataAPI.deleteMealSize(deleteTarget.id);
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const f = (key) => ({
    value: form[key] || '',
    onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value }))
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Data</h1>
          <p className="page-subtitle">Manage lookup values, states, cities, and companies</p>
        </div>
        {activeTab !== 'Standards' && (
          <Button onClick={openCreate}>Add {activeTab.slice(0, -1)}</Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
              border: 'none', background: activeTab === t ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === t ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === t ? 600 : 500,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <EmptyState title={`No ${activeTab}`} description={`No data available for ${activeTab}`} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {data.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong style={{ fontSize: 16 }}>{item.display_name || item.name}</strong>
                {item.is_active !== undefined && (
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10, background: item.is_active ? '#dcfce7' : '#f1f5f9', color: item.is_active ? '#166534' : '#475569' }}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
              
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {activeTab === 'Cities' && <span>State: {item.state_name}</span>}
                {activeTab === 'Companies' && <span>City ID: {item.city_id || 'N/A'}</span>}
                {activeTab === 'Meal Sizes' && <span>Code: {item.name} | Order: {item.sort_order}</span>}
                {activeTab === 'Standards' && <span>Grade: {item.numeric_value}</span>}
              </div>

              {activeTab !== 'Standards' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10 }}>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} style={{ color: 'var(--danger)' }}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${editTarget ? 'Edit' : 'Add'} ${activeTab.slice(0, -1)}`} size="sm">
        <form onSubmit={handleSave}>
          <Input label={activeTab === 'Meal Sizes' ? 'Internal Name (Code)' : 'Name'} required {...f('name')} />
          
          {activeTab === 'Cities' && (
            <Select label="State" required {...f('stateId')} style={{ marginTop: 12 }}>
              <option value="">Select State</option>
              {statesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          {activeTab === 'Companies' && (
            <Select label="City (Optional)" {...f('cityId')} style={{ marginTop: 12 }}>
              <option value="">None</option>
              {citiesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}

          {activeTab === 'Meal Sizes' && (
            <>
              <Input label="Display Name" required {...f('displayName')} style={{ marginTop: 12 }} />
              <Input label="Sort Order" type="number" required {...f('sortOrder')} style={{ marginTop: 12 }} />
            </>
          )}

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="active-check" type="checkbox"
              checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="active-check" style={{ fontSize: 14 }}>Active</label>
          </div>

          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Item"
        message={`Are you sure you want to delete ${deleteTarget?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

export default MasterData;
