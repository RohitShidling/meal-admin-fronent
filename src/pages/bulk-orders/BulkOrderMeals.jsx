import { useState, useEffect, useCallback, useRef } from 'react';
import { adminBulkOrdersAPI } from '../../services/api';
import { Button, Spinner, Input, Select } from '../../components/FormElements';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toast';
import { configFromApi } from './shared';

export default function BulkOrderMeals() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState({ allow_multiple_variety_meals: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [minQty, setMinQty] = useState('1');
  const [active, setActive] = useState(true);
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, mealsRes, catsRes] = await Promise.all([
        adminBulkOrdersAPI.getConfig(),
        adminBulkOrdersAPI.listVarietyMeals(),
        adminBulkOrdersAPI.listVarietyCategories(),
      ]);
      setConfig(configFromApi(cfgRes?.data || {}));
      setMeals(Array.isArray(mealsRes?.data) ? mealsRes.data : []);
      const cats = Array.isArray(catsRes?.data) ? catsRes.data : [];
      setCategories(cats);
      if (cats.length && !categoryId) setCategoryId(cats[0].id);
    } catch (err) {
      toast.error(err.message || 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (meal = null) => {
    setEdit(meal);
    setName(meal?.name || '');
    setCategoryId(meal?.category_id || categories[0]?.id || '');
    setPrice(meal?.price_per_meal != null ? String(meal.price_per_meal) : '');
    setMinQty(String(meal?.min_order_quantity ?? 1));
    setActive(meal?.is_active !== false);
    setPreview(meal?.image_url || '');
    setFile(null);
    setModalOpen(true);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!edit && !file) {
      toast.warning('Please select a meal image');
      return;
    }
    if (!name.trim()) {
      toast.warning('Meal name is required');
      return;
    }
    if (!categoryId) {
      toast.warning('Please select a category');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      if (file) fd.append('image', file);
      fd.append('name', name.trim());
      fd.append('category_id', categoryId);
      fd.append('price_per_meal', price);
      fd.append('min_order_quantity', minQty);
      fd.append('is_active', active);
      if (edit) {
        await adminBulkOrdersAPI.updateVarietyMeal(edit.id, fd);
        toast.success('Meal updated');
      } else {
        await adminBulkOrdersAPI.createVarietyMeal(fd);
        toast.success('Meal added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meal?')) return;
    try {
      await adminBulkOrdersAPI.deleteVarietyMeal(id);
      toast.success('Meal deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Bulk meals</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Assign each meal to a category. Set price and min portions per meal.
            </p>
          </div>
          <Button type="button" onClick={() => openModal()} disabled={categories.length === 0}>
            Add meal
          </Button>
        </div>
        {categories.length === 0 && (
          <p style={{ color: 'orange', marginTop: 12 }}>Create a category first.</p>
        )}
        {meals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>No meals yet.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            {meals.map((m) => (
              <div
                key={m.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: m.is_active ? 1 : 0.55,
                }}
              >
                {m.image_url && (
                  <img
                    src={m.image_url}
                    alt=""
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain',
                      background: 'var(--bg-muted)',
                    }}
                  />
                )}
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.category_name || '—'}</div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    ₹{Number(m.price_per_meal).toFixed(2)} / meal
                  </div>
                  {Number(m.min_order_quantity) > 1 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Min {m.min_order_quantity} when ordering multiple meals
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button type="button" size="sm" variant="ghost" onClick={() => openModal(m)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(m.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={edit ? 'Edit meal' : 'Add meal'}>
        <form onSubmit={handleSave}>
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div style={{ marginBottom: 16, marginTop: 12 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Meal image</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              {file || edit ? 'Change image' : 'Choose image'}
            </Button>
            {preview && (
              <img
                src={preview}
                alt=""
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  marginTop: 12,
                  borderRadius: 8,
                  background: 'var(--bg-muted)',
                }}
              />
            )}
          </div>
          <Input label="Meal name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Price per meal (₹)"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <Input
            label="Min portions (when ordering multiple meals)"
            type="number"
            min="1"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            disabled={!config.allow_multiple_variety_meals}
          />
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="meal-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <label htmlFor="meal-active">Active</label>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {edit ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


