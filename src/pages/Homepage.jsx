import { useState, useEffect, useCallback } from 'react';
import { adminHomepageAPI } from '../services/api';
import { Button, EmptyState, Spinner, Badge, ConfirmDialog } from '../components/FormElements';
import { Input } from '../components/FormElements';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const INITIAL_FORM = { name: '', description: '', display_order: '1', is_active: true };

export default function Homepage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      // Uses GET /api/common/homepage (public, no-auth read)
      const res = await adminHomepageAPI.getAll();
      setSections(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load homepage sections');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (section) => {
    setEditTarget(section);
    setForm({
      name: section.name || '',
      description: section.description || '',
      display_order: section.display_order?.toString() || '1',
      is_active: section.is_active ?? true,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Section name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.display_order || isNaN(Number(form.display_order)) || Number(form.display_order) < 1)
      e.display_order = 'Valid display order required (min: 1)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      display_order: Number(form.display_order),
      is_active: form.is_active,
    };
    try {
      if (editTarget) {
        await adminHomepageAPI.update(editTarget.id, payload);
        toast.success('Section updated successfully');
      } else {
        await adminHomepageAPI.create(payload);
        toast.success('Section created successfully');
      }
      setModalOpen(false);
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminHomepageAPI.delete(deleteTarget.id);
      toast.success('Section deleted');
      setDeleteTarget(null);
      fetchSections();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Homepage Manager</h1>
          <p className="page-subtitle">Manage the sections displayed on the public homepage</p>
        </div>
        <Button icon={<PlusIcon />} onClick={openCreate} id="add-section-btn">
          Add Section
        </Button>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'var(--accent-bg)',
        border: '1px solid var(--accent-primary)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 16px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}>
        <InfoIcon />
        <span>
          Sections are displayed on the public Buuttii website in <strong>display_order</strong> sequence.
          Each order number must be unique.
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
      ) : sections.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<PageSVG />}
            title="No homepage sections"
            description="Create your first section to populate the public Buuttii homepage"
            action={<Button onClick={openCreate} icon={<PlusIcon />}>Add Section</Button>}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((section) => (
              <div key={section.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '20px 24px' }}>
                {/* Order badge */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-bg)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {section.display_order}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{section.name}</h3>
                    <Badge variant={section.is_active ? 'success' : 'default'}>
                      {section.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      ID: {section.id}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    {section.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="action-btns" style={{ flexShrink: 0 }}>
                  <button
                    className="icon-btn"
                    title="Edit section"
                    onClick={() => openEdit(section)}
                    id={`edit-section-${section.id}`}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Delete section"
                    onClick={() => setDeleteTarget(section)}
                    id={`delete-section-${section.id}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Homepage Section' : 'New Homepage Section'}
        size="md"
      >
        <form onSubmit={handleSave} id="homepage-section-form">
          <Input
            id="section-name"
            label="Section Name"
            placeholder="e.g. Welcome Banner"
            error={errors.name}
            required
            {...f('name')}
          />
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Description <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              id="section-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Content or description for this homepage section"
              rows={4}
              className={`form-input form-textarea${errors.description ? ' form-input-error' : ''}`}
            />
            {errors.description && <p className="form-error" style={{ marginTop: 4 }}>{errors.description}</p>}
          </div>
          <div style={{ marginTop: 16 }}>
            <Input
              id="section-display-order"
              label="Display Order"
              type="number"
              min="1"
              placeholder="1"
              hint="Lower numbers appear first. Each value must be unique."
              error={errors.display_order}
              required
              {...f('display_order')}
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="section-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="section-active" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Active (visible on public homepage)
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 24 }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} id="section-save-btn">
              {editTarget ? 'Update Section' : 'Create Section'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Homepage Section"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove it from the public homepage.`}
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
const InfoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--accent-primary)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const PageSVG = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
