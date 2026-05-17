import { useState, useEffect, useCallback, useRef } from 'react';
import { adminBulkOrdersAPI } from '../../services/api';
import { Button, Spinner, Input } from '../../components/FormElements';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toast';

export default function BulkOrderCategories() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminBulkOrdersAPI.listVarietyCategories();
      setCategories(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (cat = null) => {
    setEdit(cat);
    setName(cat?.name || '');
    setDescription(cat?.description || '');
    setSortOrder(String(cat?.sort_order ?? 0));
    setActive(cat?.is_active !== false);
    setPreview(cat?.image_url || '');
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
    if (!name.trim()) {
      toast.warning('Category name is required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      if (file) fd.append('image', file);
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('sort_order', sortOrder);
      fd.append('is_active', active);
      if (edit) {
        await adminBulkOrdersAPI.updateVarietyCategory(edit.id, fd);
        toast.success('Category updated');
      } else {
        await adminBulkOrdersAPI.createVarietyCategory(fd);
        toast.success('Category created');
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
    if (!window.confirm('Delete this category?')) return;
    try {
      await adminBulkOrdersAPI.deleteVarietyCategory(id);
      toast.success('Category deleted');
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
            <h3 style={{ marginTop: 0 }}>Meal categories</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Customers browse these categories before choosing meals (e.g. South Indian).
            </p>
          </div>
          <Button type="button" onClick={() => openModal()}>
            Add category
          </Button>
        </div>

        {categories.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>No categories yet.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
              marginTop: 20,
            }}
          >
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: c.is_active ? 1 : 0.55,
                }}
              >
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt=""
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain',
                      background: 'var(--bg-muted)',
                    }}
                  />
                ) : (
                  <div style={{ height: 80, background: 'var(--bg-muted)' }} />
                )}
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {c.meal_count ?? 0} meal(s)
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button type="button" size="sm" variant="ghost" onClick={() => openModal(c)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={edit ? 'Edit category' : 'Add category'}>
        <form onSubmit={handleSave}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label="Sort order" type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Image (optional)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              Choose image
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input id="cat-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <label htmlFor="cat-active">Active</label>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {edit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}




