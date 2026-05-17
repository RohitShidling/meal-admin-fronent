import { useState, useEffect, useCallback, useRef } from 'react';
import { adminMenuAPI, adminMenuNutritionAPI, commonAPI } from '../services/api';
import { Button, EmptyState, Spinner, ConfirmDialog } from '../components/FormElements';
import { Input } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const formatDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const getLocalYYYYMMDD = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return d.slice(0, 10);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Menu() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadDate, setUploadDate] = useState('');
  const [items, setItems] = useState('');
  const [nutritionPoints, setNutritionPoints] = useState(['']);
  const [isActive, setIsActive] = useState(true);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      // Menus + nutrition are fetched separately and merged by date.
      const [menuRes, nutritionRes] = await Promise.all([
        commonAPI.getMenuHistory({ limit: 50 }),
        adminMenuNutritionAPI.getHistory({ limit: 100 }),
      ]);

      const baseMenus = Array.isArray(menuRes?.data) ? menuRes.data : [];
      const nutritionRows = Array.isArray(nutritionRes?.data) ? nutritionRes.data : [];

      const nutritionByDate = nutritionRows.reduce((acc, row) => {
        const key = getLocalYYYYMMDD(row?.menu_date || '');
        if (!key) return acc;
        acc[key] = Array.isArray(row?.nutrition_points) ? row.nutrition_points : [];
        return acc;
      }, {});

      const mergedMenus = baseMenus.map((menu) => {
        const dateKey = getLocalYYYYMMDD(menu?.menu_date || '');
        return {
          ...menu,
          nutrition_points: nutritionByDate[dateKey] || [],
        };
      });

      setMenus(mergedMenus);
    } catch (err) {
      toast.error(err.message || 'Failed to load menus');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  const openUpload = () => {
    setEditTarget(null);
    setSelectedFile(null);
    setPreview('');
    setItems('');
    setNutritionPoints(['']);
    setIsActive(true);
    setUploadDate(todayStr());
    setUploadOpen(true);
  };

  const openEdit = (menu) => {
    setEditTarget(menu);
    setSelectedFile(null);
    setPreview(menu.image_url || '');
    setItems(menu.items || '');
    setIsActive(menu.is_active ?? true);
    setUploadDate(menu.menu_date ? getLocalYYYYMMDD(menu.menu_date) : todayStr());
    setUploadOpen(true);
    const menuDate = menu.menu_date ? getLocalYYYYMMDD(menu.menu_date) : todayStr();
    adminMenuNutritionAPI.getByDate(menuDate)
      .then((res) => {
        const points = Array.isArray(res?.data?.nutrition_points) ? res.data.nutrition_points : [];
        setNutritionPoints(points.length ? points : ['']);
      })
      .catch(() => {
        setNutritionPoints(['']);
      });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editTarget && !selectedFile) { toast.warning('Please select an image'); return; }
    if (!uploadDate) { toast.warning('Please select a date'); return; }
    setSaving(true);
    try {
      // Backend expects multipart/form-data:
      // POST /upload: fields { image (file), menu_date, items }
      // PUT /:date:  fields { image? (file), items, is_active }
      const fd = new FormData();
      if (selectedFile) fd.append('image', selectedFile);
      fd.append('menu_date', uploadDate);
      if (items) fd.append('items', items);
      if (editTarget) fd.append('is_active', isActive);

      if (editTarget) {
        const sourceDate = editTarget.menu_date ? getLocalYYYYMMDD(editTarget.menu_date) : uploadDate;
        await adminMenuAPI.update(sourceDate, fd);
        toast.success('Menu updated');
      } else {
        await adminMenuAPI.upload(fd);
        toast.success('Menu uploaded');
      }

      const cleanedNutrition = nutritionPoints.map((x) => String(x || '').trim()).filter(Boolean);
      await adminMenuNutritionAPI.upsert({
        menu_date: uploadDate,
        nutrition_points: cleanedNutrition,
      });

      setUploadOpen(false);
      fetchMenus();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const updateNutrition = (idx, value) => {
    setNutritionPoints((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addNutrition = () => {
    setNutritionPoints((prev) => [...prev, '']);
  };

  const removeNutrition = (idx) => {
    setNutritionPoints((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next.length ? next : [''];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const date = deleteTarget.menu_date ? getLocalYYYYMMDD(deleteTarget.menu_date) : '';
      await adminMenuAPI.delete(date);
      toast.success('Menu deleted');
      setDeleteTarget(null);
      fetchMenus();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Menu</h1>
          <p className="page-subtitle">Upload and manage daily meal menus</p>
        </div>
        <Button icon={<UploadIcon />} onClick={openUpload} id="upload-menu-btn">Upload Menu</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : menus.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<MenuSVG />}
            title="No menus uploaded"
            description="Upload today's menu to display it to clients"
            action={<Button onClick={openUpload} icon={<UploadIcon />}>Upload Menu</Button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {menus.map((m) => (
            <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Menu image */}
              <div style={{ aspectRatio: '4/3', background: 'var(--bg-input)', overflow: 'hidden' }}>
                {m.image_url ? (
                  <img
                    src={m.image_url}
                    alt={`Menu ${m.menu_date}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <MenuSVG />
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {formatDate(m.menu_date)}
                </div>
                {m.items && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{m.items}</p>}
                {Array.isArray(m.nutrition_points) && m.nutrition_points.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {m.nutrition_points.slice(0, 3).map((point, idx) => (
                      <div key={`${m.id}-nutri-${idx}`} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        • {point}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" icon={<EditIcon />} onClick={() => openEdit(m)} id={`edit-menu-${m.id}`}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" icon={<TrashIcon />} onClick={() => setDeleteTarget(m)} id={`delete-menu-${m.id}`} style={{ color: 'var(--danger)' }}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Modal */}
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title={editTarget ? 'Update Menu' : 'Upload Menu'} size="md">
        <form onSubmit={handleSave} id="menu-form">
          <Input
            id="menu-date"
            label="Menu Date"
            type="date"
            value={uploadDate}
            onChange={(e) => setUploadDate(e.target.value)}
            required
          />
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Menu Image {editTarget ? '(leave empty to keep existing)' : '*'}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              id="menu-upload-zone"
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius)',
                padding: 24,
                cursor: 'pointer',
                textAlign: 'center',
                background: 'var(--bg-input)',
                transition: 'border-color 0.2s',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  const r = new FileReader();
                  r.onload = (ev) => setPreview(ev.target.result);
                  r.readAsDataURL(file);
                }
              }}
            >
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  <UploadIcon />
                  <p style={{ marginTop: 8, fontSize: 14 }}>Click or drag to upload image</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>PNG, JPG, WEBP supported</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} id="menu-file-input" />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Menu Items (optional)
            </label>
            <textarea
              id="menu-items"
              rows={2}
              placeholder="e.g. Dal Rice, Sabzi, Roti, Salad"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '10px 14px',
                fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Nutrition Details
              </label>
              <Button type="button" size="sm" variant="secondary" onClick={addNutrition}>
                Add Nutrition
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nutritionPoints.map((point, idx) => (
                <div key={`nutrition-${idx}`} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => updateNutrition(idx, e.target.value)}
                    placeholder={`Nutrition ${idx + 1} (e.g. Protein: 12g)`}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeNutrition(idx)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {editTarget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  id="menu-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="menu-active" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Active (display to users)
                </label>
              </div>
            )}
          </div>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} id="menu-save-btn">
              {editTarget ? 'Update Menu' : 'Upload Menu'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Menu"
        message={`Delete menu for ${deleteTarget?.menu_date ? formatDate(deleteTarget.menu_date) : 'this date'}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

const UploadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const MenuSVG = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
