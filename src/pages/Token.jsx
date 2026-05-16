import { useEffect, useMemo, useRef, useState } from 'react';
import { adminMealsAPI, adminTokenAPI, commonAPI } from '../services/api';
import { Badge, Button, EmptyState, Spinner } from '../components/FormElements';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const TABS = ['School', 'Corporate'];

function getTodayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.schools)) return payload.schools;
  if (Array.isArray(payload?.locations)) return payload.locations;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/** Backend `/tokens/corporate` uses corporate_location_*; legacy rows may use location_* / id. */
function corpLocationId(row) {
  if (!row || typeof row !== 'object') return '';
  const id = row.corporate_location_id ?? row.location_id ?? row.locationId ?? row.id;
  if (id === undefined || id === null || String(id).trim() === '') return '';
  return String(id).trim();
}

function corpLocationName(row) {
  if (!row || typeof row !== 'object') return '';
  const name = row.corporate_location_name ?? row.location_name ?? row.name ?? '';
  return String(name).trim();
}

function readFilename(headers, fallback) {
  const contentDisposition = headers.get('content-disposition') || '';
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const defaultMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return defaultMatch?.[1] || fallback;
}

function browserDownload(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function safeFilenameSegment(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function tokenDateForFilename(selectedDate) {
  const d = String(selectedDate ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return getTodayDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = String(((hours24 + 11) % 12) + 1).padStart(2, '0');

  return `${day}-${month}-${year}, ${hours12}:${minutes} ${ampm}`;
}

function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  const selected = options.find((o) => String(o.id) === String(value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-input)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
        }}
      >
        <span>{selected?.name || placeholder}</span>
        <span style={{ fontSize: 11, opacity: 0.8 }}>â–¼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow)',
            zIndex: 40,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 10, borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(String(o.id));
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: 'none',
                    borderTop: '1px solid var(--border-subtle)',
                    background: String(o.id) === String(value) ? 'var(--accent-bg)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {o.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TokenPage() {
  const [activeTab, setActiveTab] = useState('School');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingKey, setDownloadingKey] = useState('');
  const [schoolRows, setSchoolRows] = useState([]);
  const [schoolPanelRows, setSchoolPanelRows] = useState([]);
  const [mealSizeCatalog, setMealSizeCatalog] = useState([]);
  const [corporateRows, setCorporateRows] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedSchoolKey, setSelectedSchoolKey] = useState('');
  const [schoolDetails, setSchoolDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [mealOpLoading, setMealOpLoading] = useState('');
  const [scopedModalOpen, setScopedModalOpen] = useState(false);
  const [scopedOptionsLoading, setScopedOptionsLoading] = useState(false);
  const [scopedOptionsError, setScopedOptionsError] = useState('');
  const [scopedOptions, setScopedOptions] = useState({ schools: [], corporates: [] });
  const [scopedSchoolIds, setScopedSchoolIds] = useState([]);
  const [scopedCorpIds, setScopedCorpIds] = useState([]);
  const [scopedSubmitting, setScopedSubmitting] = useState(false);

  /** Optional for API: empty string omits ?date (backend uses its default delivery date). */
  const dateArg = selectedDate.trim() === '' ? undefined : selectedDate.trim();

  const loadCatalog = async () => {
    try {
      const res = await commonAPI.getMealSizes();
      setMealSizeCatalog(toArray(res?.data?.mealSizes || res?.data));
    } catch {
      setMealSizeCatalog([]);
    }
  };

  const loadSchoolOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, panelRes] = await Promise.all([
        adminTokenAPI.getSchools(dateArg),
        adminTokenAPI.getSchoolsPanel(dateArg).catch(() => ({ data: [] })),
      ]);
      setSchoolRows(toArray(overviewRes?.data));
      setSchoolPanelRows(toArray(panelRes?.data));
    } catch (err) {
      setError(err.message || 'Failed to load school tokens');
    } finally {
      setLoading(false);
    }
  };

  const loadCorporateOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminTokenAPI.getCorporate(dateArg);
      setCorporateRows(toArray(res?.data));
    } catch (err) {
      setError(err.message || 'Failed to load corporate tokens');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedSchoolDetails = async (schoolId, mealSizeId) => {
    setDetailsLoading(true);
    try {
      const res = await adminTokenAPI.getSchoolMealSize(schoolId, mealSizeId, dateArg, true);
      setSchoolDetails(toArray(res?.data));
    } catch (err) {
      toast.error(err.message || 'Failed to load token details');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (activeTab === 'School') {
      setSelectedLocationId('');
      loadSchoolOverview();
    } else {
      setSelectedSchoolId('');
      setSelectedSchoolKey('');
      setSchoolDetails([]);
      loadCorporateOverview();
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    if (selectedSchoolId && !schoolRows.some((s) => String(s.school_id || s.schoolId || s.id) === String(selectedSchoolId))) {
      setSelectedSchoolId('');
      setSelectedSchoolKey('');
      setSchoolDetails([]);
    }
  }, [schoolRows, selectedSchoolId]);

  // Auto-select the first school when School tab loads
  useEffect(() => {
    if (activeTab !== 'School') return;
    if (selectedSchoolId) return;
    if (!Array.isArray(schoolRows) || schoolRows.length === 0) return;

    const sorted = [...schoolRows].sort((a, b) => {
      const an = String(a?.name || a?.school_name || '').toLowerCase();
      const bn = String(b?.name || b?.school_name || '').toLowerCase();
      return an.localeCompare(bn);
    });
    const first = sorted[0];
    const firstId = first?.school_id || first?.schoolId || first?.id;
    if (!firstId) return;

    setSelectedSchoolId(String(firstId));
    setSelectedSchoolKey('');
    setSchoolDetails([]);
  }, [activeTab, schoolRows, selectedSchoolId]);

  useEffect(() => {
    if (
      selectedLocationId &&
      !corporateRows.some((r) => corpLocationId(r) === String(selectedLocationId))
    ) {
      setSelectedLocationId('');
    }
  }, [corporateRows, selectedLocationId]);

  // Auto-select the first corporate location when Corporate tab loads
  useEffect(() => {
    if (activeTab !== 'Corporate') return;
    if (selectedLocationId) return;
    if (!Array.isArray(corporateRows) || corporateRows.length === 0) return;

    const sorted = [...corporateRows].sort((a, b) => {
      const an = corpLocationName(a).toLowerCase();
      const bn = corpLocationName(b).toLowerCase();
      return an.localeCompare(bn);
    });
    const firstId = corpLocationId(sorted[0]);
    if (firstId) setSelectedLocationId(firstId);
  }, [activeTab, corporateRows, selectedLocationId]);

  const handleSchoolDownload = async (schoolId, mealSizeId) => {
    const key = `${schoolId}-${mealSizeId}`;
    setDownloadingKey(key);
    try {
      const { blob, headers } = await adminTokenAPI.downloadSchoolMealSizePdf(schoolId, mealSizeId, dateArg);
      const tokenDate = tokenDateForFilename(selectedDate);
      const school = schoolRows.find((s) => String(s.school_id || s.schoolId || s.id) === String(schoolId));
      const schoolName = safeFilenameSegment(school?.name || school?.school_name || `School-${schoolId}`);
      const mealSizeLabel = safeFilenameSegment(
        mealSizeCatalog.find((m) => String(m.id) === String(mealSizeId))?.display_name
          || mealSizeCatalog.find((m) => String(m.id) === String(mealSizeId))?.displayName
          || mealSizeCatalog.find((m) => String(m.id) === String(mealSizeId))?.name
          || `MealSize-${mealSizeId}`
      );
      const fallback = `${tokenDate} - ${schoolName} - ${mealSizeLabel} - Token.pdf`;
      browserDownload(blob, readFilename(headers, fallback) || fallback);
      toast.success('PDF downloaded');
      await loadSchoolOverview();
      if (selectedSchoolKey === key) {
        await loadSelectedSchoolDetails(schoolId, mealSizeId);
      }
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloadingKey('');
    }
  };

  const handleWholeSchoolDownload = async (schoolId) => {
    const key = `whole-${schoolId}`;
    setDownloadingKey(key);
    try {
      const { blob, headers } = await adminTokenAPI.downloadSchoolPdf(schoolId, dateArg);
      const tokenDate = tokenDateForFilename(selectedDate);
      const school = schoolRows.find((s) => String(s.school_id || s.schoolId || s.id) === String(schoolId));
      const schoolName = safeFilenameSegment(school?.name || school?.school_name || `School-${schoolId}`);
      const fallback = `${tokenDate} - ${schoolName} - All Meal Sizes - Token.pdf`;
      browserDownload(blob, readFilename(headers, fallback) || fallback);
      toast.success('Whole school PDF downloaded');
      await loadSchoolOverview();
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloadingKey('');
    }
  };

  const handleExport = async (type) => {
    setDownloadingKey(`export-${type}`);
    try {
      const apiCall = type === 'schools'
        ? adminTokenAPI.exportSchoolsPdf
        : type === 'corporate'
          ? adminTokenAPI.exportCorporatePdf
          : adminTokenAPI.exportAllPdf;
      const { blob, headers } = await apiCall(dateArg);
      const tokenDate = tokenDateForFilename(selectedDate);
      const fallback = type === 'schools'
        ? `${tokenDate} - All Schools - Token.pdf`
        : type === 'corporate'
          ? `${tokenDate} - All Companies - Token.pdf`
          : `${tokenDate} - All Tokens (Schools + Companies) - Token.pdf`;
      browserDownload(blob, readFilename(headers, fallback) || fallback);
      toast.success('Export downloaded');
      if (activeTab === 'School') {
        await loadSchoolOverview();
      } else {
        await loadCorporateOverview();
      }
    } catch (err) {
      toast.error(err.message || 'Export download failed');
    } finally {
      setDownloadingKey('');
    }
  };

  const handleCorporateDownload = async (locationId) => {
    const key = `corp-${locationId}`;
    setDownloadingKey(key);
    try {
      const { blob, headers } = await adminTokenAPI.downloadCorporatePdf(locationId, dateArg);
      const tokenDate = tokenDateForFilename(selectedDate);
      const location = corporateRows.find((r) => corpLocationId(r) === String(locationId));
      const locationName = safeFilenameSegment(
        corpLocationName(location || {}) || `Company-${locationId}`
      );
      const fallback = `${tokenDate} - ${locationName} - Token.pdf`;
      browserDownload(blob, readFilename(headers, fallback) || fallback);
      toast.success('PDF downloaded');
      await loadCorporateOverview();
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloadingKey('');
    }
  };

  const openScopedReduceModal = async () => {
    setScopedModalOpen(true);
    setScopedOptionsLoading(true);
    setScopedOptionsError('');
    setScopedSchoolIds([]);
    setScopedCorpIds([]);
    try {
      const res = await adminMealsAPI.getReduceScopeOptions(dateArg ? { date: dateArg } : {});
      const data = res?.data ?? res;
      setScopedOptions({
        schools: Array.isArray(data?.schools) ? data.schools : [],
        corporates: Array.isArray(data?.corporates) ? data.corporates : [],
      });
    } catch (err) {
      setScopedOptionsError(err.message || 'Failed to load scope options');
      setScopedOptions({ schools: [], corporates: [] });
    } finally {
      setScopedOptionsLoading(false);
    }
  };

  const toggleScopedSchool = (schoolId) => {
    const s = String(schoolId);
    setScopedSchoolIds((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const toggleScopedCorp = (corpId) => {
    const s = String(corpId);
    setScopedCorpIds((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const selectAllScopedSchools = () => {
    const all = scopedOptions.schools.map((row) => String(row.school_id));
    const allIncluded = all.length > 0 && all.every((id) => scopedSchoolIds.includes(id));
    setScopedSchoolIds(allIncluded ? [] : all);
  };

  const selectAllScopedCorps = () => {
    const all = scopedOptions.corporates.map((row) =>
      String(row.corporate_location_id ?? row.location_id ?? row.id ?? '')
    ).filter(Boolean);
    const allIncluded = all.length > 0 && all.every((id) => scopedCorpIds.includes(id));
    setScopedCorpIds(allIncluded ? [] : all);
  };

  const submitScopedReduce = async () => {
    if (scopedSchoolIds.length === 0 && scopedCorpIds.length === 0) {
      toast.error('Select at least one school or corporate location');
      return;
    }
    setScopedSubmitting(true);
    try {
      const body = {
        schoolIds: scopedSchoolIds,
        corporateLocationIds: scopedCorpIds,
      };
      if (dateArg) body.date = dateArg;
      const res = await adminMealsAPI.reduceScoped(body);
      toast.success(res?.message || 'Scoped reduction completed');
      setScopedModalOpen(false);
      if (activeTab === 'School') {
        await loadSchoolOverview();
      } else {
        await loadCorporateOverview();
      }
    } catch (err) {
      toast.error(err.message || 'Scoped reduction failed');
    } finally {
      setScopedSubmitting(false);
    }
  };

  const handleMealOperation = async (type) => {
    setMealOpLoading(type);
    try {
      const res = type === 'reduce'
        ? await adminMealsAPI.reduceToday()
        : await adminMealsAPI.reverseReduceToday();
      toast.success(res?.message || (type === 'reduce' ? 'Meal reduction completed' : 'Meal reduction rollback completed'));
    } catch (err) {
      toast.error(err.message || (type === 'reduce' ? 'Failed to reduce meals for today' : 'Failed to reverse today reduction'));
    } finally {
      setMealOpLoading('');
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div className="page-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Token</h1>
          <p className="page-subtitle">Download school and corporate token PDFs. Top actions export all school, company, or combined records.</p>
        </div>
        <div style={{ minWidth: 0, width: '100%', maxWidth: 280, flexShrink: 0 }}>
          <label htmlFor="token-date" style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Delivery date (optional)</label>
          <input
            id="token-date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSchoolKey('');
              setSelectedSchoolId('');
              setSelectedLocationId('');
              setSchoolDetails([]);
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate(getTodayDateString())}>
              Today
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Button
          variant="secondary"
          loading={mealOpLoading === 'reduce'}
          onClick={() => handleMealOperation('reduce')}
        >
          Reduce Meals for Today
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={openScopedReduceModal}
        >
          Scoped reduce…
        </Button>
        <Button
          variant="ghost"
          loading={mealOpLoading === 'reverse'}
          onClick={() => handleMealOperation('reverse')}
        >
          Reverse Today Reduction
        </Button>
        <Button
          variant="secondary"
          loading={downloadingKey === 'export-schools'}
          onClick={() => handleExport('schools')}
        >
          All School Records
        </Button>
        <Button
          variant="secondary"
          loading={downloadingKey === 'export-corporate'}
          onClick={() => handleExport('corporate')}
        >
          All Company Records
        </Button>
        <Button
          loading={downloadingKey === 'export-all'}
          onClick={() => handleExport('all')}
        >
          Combined Export
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 10,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          minWidth: 0,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === t ? 'var(--accent-primary)' : 'transparent',
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
      ) : error ? (
        <div className="card">
          <EmptyState
            title="Failed to load data"
            description={error}
            action={<Button onClick={activeTab === 'School' ? loadSchoolOverview : loadCorporateOverview}>Retry</Button>}
          />
        </div>
      ) : activeTab === 'School' ? (
        <SchoolTab
          rows={schoolRows}
          panelRows={schoolPanelRows}
          mealSizeCatalog={mealSizeCatalog}
          selectedSchoolId={selectedSchoolId}
          setSelectedSchoolId={setSelectedSchoolId}
          selectedSchoolKey={selectedSchoolKey}
          setSelectedSchoolKey={setSelectedSchoolKey}
          onLoadDetails={loadSelectedSchoolDetails}
          details={schoolDetails}
          detailsLoading={detailsLoading}
          onDownload={handleSchoolDownload}
          onDownloadWholeSchool={handleWholeSchoolDownload}
          downloadingKey={downloadingKey}
        />
      ) : (
        <CorporateTab
          rows={corporateRows}
          selectedLocationId={selectedLocationId}
          setSelectedLocationId={setSelectedLocationId}
          onDownload={handleCorporateDownload}
          downloadingKey={downloadingKey}
        />
      )}

      {scopedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scoped-reduce-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            if (!scopedSubmitting) setScopedModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 560,
              width: '100%',
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <h3 id="scoped-reduce-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Scoped meal reduction
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                Deduct one meal only for subscriptions linked to selected schools or company locations.
                Delivery date: <strong>{dateArg || getTodayDateString()}</strong>
              </p>
            </div>
            <div style={{ padding: 14, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {scopedOptionsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
              ) : scopedOptionsError ? (
                <EmptyState
                  title="Could not load options"
                  description={scopedOptionsError}
                  action={
                    <Button type="button" size="sm" onClick={() => openScopedReduceModal()}>
                      Retry
                    </Button>
                  }
                />
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 14 }}>Schools</strong>
                      <button type="button" onClick={selectAllScopedSchools} style={{ border: 'none', background: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }}>
                        Toggle all
                      </button>
                    </div>
                    {scopedOptions.schools.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No schools with eligible tokens for this date.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                        {scopedOptions.schools.map((row) => {
                          const sid = String(row.school_id);
                          const label = row.school_name || sid;
                          return (
                            <label key={sid} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                              <input type="checkbox" checked={scopedSchoolIds.includes(sid)} onChange={() => toggleScopedSchool(sid)} />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 14 }}>Company locations</strong>
                      <button type="button" onClick={selectAllScopedCorps} style={{ border: 'none', background: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }}>
                        Toggle all
                      </button>
                    </div>
                    {scopedOptions.corporates.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No corporate locations with eligible professionals for this date.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                        {scopedOptions.corporates.map((row) => {
                          const cid = String(row.corporate_location_id ?? row.location_id ?? row.id ?? '');
                          if (!cid) return null;
                          const label = row.corporate_location_name || row.location_name || cid;
                          return (
                            <label key={cid} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                              <input type="checkbox" checked={scopedCorpIds.includes(cid)} onChange={() => toggleScopedCorp(cid)} />
                              <span>
                                {label}
                                {row.professionals_count != null ? (
                                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> — {row.professionals_count} pro</span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap' }}>
              <Button type="button" variant="ghost" disabled={scopedSubmitting} onClick={() => setScopedModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" loading={scopedSubmitting} disabled={scopedOptionsLoading || !!scopedOptionsError} onClick={submitScopedReduce}>
                Reduce selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SchoolTab({
  rows,
  panelRows,
  mealSizeCatalog,
  selectedSchoolId,
  setSelectedSchoolId,
  selectedSchoolKey,
  setSelectedSchoolKey,
  onLoadDetails,
  details,
  detailsLoading,
  onDownload,
  onDownloadWholeSchool,
  downloadingKey,
}) {
  const panelMap = useMemo(() => {
    const map = new Map();
    panelRows.forEach((row) => {
      const schoolId = row.school_id || row.schoolId || row.id;
      if (schoolId) map.set(String(schoolId), row);
    });
    return map;
  }, [panelRows]);

  const mealSizeLabelById = useMemo(() => {
    const map = new Map();
    mealSizeCatalog.forEach((m) => {
      if (m?.id == null) return;
      map.set(String(m.id), m.display_name || m.displayName || m.name || String(m.id));
    });
    return map;
  }, [mealSizeCatalog]);

  const schoolOptions = useMemo(() => {
    return rows
      .map((s) => {
        const id = s.school_id || s.schoolId || s.id;
        const name = s.name || s.school_name || `School ${id}`;
        return { id: String(id), name };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState title="No schools available" description="No school token records found for this date." />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ maxWidth: 520 }}>
        <SearchableDropdown
          label="Select School"
          value={selectedSchoolId}
          onChange={(newId) => {
            setSelectedSchoolId(newId);
            setSelectedSchoolKey('');
          }}
          options={schoolOptions}
          placeholder="Choose a school"
          searchPlaceholder="Search school..."
          emptyText="No schools match your search"
        />
      </div>

      {!selectedSchoolId ? (
        <div className="card">
          <EmptyState title="Select a school" description="Choose a school from the dropdown to view meal sizes and downloads." />
        </div>
      ) : (() => {
        const school = rows.find((s) => String(s.school_id || s.schoolId || s.id) === String(selectedSchoolId));
        if (!school) {
          return (
            <div className="card">
              <EmptyState title="School not found" description="This school is no longer in the list for the selected date." />
            </div>
          );
        }
        const schoolId = school?.school_id || school?.schoolId || school?.id;
        const mealSizes = toArray(school?.mealSizes || school?.meal_sizes);
        const schoolPanel = panelMap.get(String(schoolId));
        const buttonRows = toArray(schoolPanel?.meal_size_buttons || schoolPanel?.mealSizes || schoolPanel?.meal_sizes);
        const catalogButtons = mealSizeCatalog.map((catalogItem) => {
          const panelButton = buttonRows.find((button) => String(button.meal_size_id ?? button.mealSizeId ?? button.id) === String(catalogItem.id));
          const overviewItem = mealSizes.find((size) => String(size.meal_size_id ?? size.mealSizeId ?? size.id) === String(catalogItem.id));
          return {
            id: catalogItem.id,
            label: catalogItem.display_name || catalogItem.name,
            eligible_count: panelButton?.eligible_count ?? overviewItem?.students_count ?? 0,
            can_download_pdf: panelButton?.can_download_pdf ?? (overviewItem?.students_count ?? 0) > 0,
          };
        });

        return (
          <div className="card">
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{school?.name || school?.school_name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{school?.city || ''}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge variant="default">{mealSizes.length} meal sizes</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={downloadingKey === `whole-${schoolId}`}
                  onClick={() => onDownloadWholeSchool(schoolId)}
                  disabled={!schoolId}
                >
                  Whole school PDF
                </Button>
              </div>
            </div>

            {catalogButtons.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {catalogButtons.map((button) => (
                  <button
                    key={`${schoolId}-${button.id}`}
                    type="button"
                    onClick={() => {
                      if (!button.can_download_pdf || button.eligible_count === 0) return;
                      setSelectedSchoolKey(`${schoolId}-${button.id}`);
                    }}
                    disabled={!button.can_download_pdf || button.eligible_count === 0}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '8px 12px',
                      background: selectedSchoolKey === `${schoolId}-${button.id}` ? 'var(--accent-primary)' : 'var(--bg-card)',
                      color: selectedSchoolKey === `${schoolId}-${button.id}` ? '#fff' : (!button.can_download_pdf || button.eligible_count === 0 ? 'var(--text-muted)' : 'var(--text-primary)'),
                      cursor: !button.can_download_pdf || button.eligible_count === 0 ? 'not-allowed' : 'pointer',
                      opacity: !button.can_download_pdf || button.eligible_count === 0 ? 0.6 : 1,
                    }}
                  >
                    {button.label} ({button.eligible_count})
                  </button>
                ))}
              </div>
            )}

            {mealSizes.length === 0 ? (
              <EmptyState title="No meal sizes" description="This school has no token entries right now." />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Meal Size</th>
                      <th>Students</th>
                      <th>Downloaded</th>
                      <th>Download Count</th>
                      <th>Last Downloaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealSizes.map((size) => {
                      const mealSizeId = size.meal_size_id ?? size.mealSizeId ?? size.id;
                      const key = `${schoolId}-${mealSizeId}`;
                      const invalidMealSize = !/^\d+$/.test(String(mealSizeId ?? '').trim());
                      const invalidRow = !schoolId || invalidMealSize;
                      const selected = selectedSchoolKey === key;
                      const mealSizeLabel =
                        size.meal_size_name ||
                        size.mealSizeName ||
                        size.display_name ||
                        size.displayName ||
                        size.name ||
                        mealSizeLabelById.get(String(mealSizeId)) ||
                        (mealSizeId != null ? mealSizeLabelById.get(String(mealSizeId)) ?? `Meal Size ${mealSizeId}` : '—');
                      return (
                        <tr key={key}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mealSizeLabel}</td>
                          <td>{size.students_count ?? 0}</td>
                          <td>
                            <Badge variant={size.downloaded ? 'success' : 'default'}>
                              {size.downloaded ? 'Downloaded' : 'Not Downloaded'}
                            </Badge>
                          </td>
                          <td>{size.download_count ?? 0}</td>
                          <td>{formatDateTime(size.last_downloaded_at)}</td>
                          <td>
                            <div className="action-btns">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedSchoolKey(key);
                                  onLoadDetails(schoolId, mealSizeId);
                                }}
                                disabled={invalidRow}
                              >
                                Details
                              </Button>
                              <Button
                                size="sm"
                                loading={downloadingKey === key}
                                onClick={() => onDownload(schoolId, mealSizeId)}
                                disabled={invalidRow}
                              >
                                Meal size PDF
                              </Button>
                            </div>
                            {invalidRow && (
                              <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
                                Invalid school/meal size ID
                              </span>
                            )}
                            {selected && <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>Details loaded below</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {selectedSchoolKey && (
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16, fontWeight: 700 }}>School Token Details</h3>
          {detailsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner /></div>
          ) : details.length === 0 ? (
            <EmptyState title="No token records" description="No user records returned for this meal size." />
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(details[0]).map((col) => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(details[0]).map((col) => (
                        <td key={col}>{String(row[col] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function CorporateTab({
  rows,
  selectedLocationId,
  setSelectedLocationId,
  onDownload,
  downloadingKey,
}) {
  const corporateOptions = useMemo(() => {
    return rows
      .map((r) => {
        const id = corpLocationId(r);
        const name = corpLocationName(r) || (id ? `Location ${id}` : '');
        return id ? { id: String(id), name } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const selectedRow = useMemo(() => {
    if (!selectedLocationId) return null;
    return rows.find((r) => corpLocationId(r) === String(selectedLocationId)) || null;
  }, [rows, selectedLocationId]);

  if (!rows.length) {
    return (
      <div className="card">
        <EmptyState title="No corporate locations" description="No company token records found for this date." />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ maxWidth: 520 }}>
        <SearchableDropdown
          label="Select Company Location"
          value={selectedLocationId}
          onChange={(newId) => setSelectedLocationId(newId)}
          options={corporateOptions}
          placeholder="Choose a location"
          searchPlaceholder="Search company/location..."
          emptyText="No locations match your search"
        />
      </div>

      {!selectedLocationId ? (
        <div className="card">
          <EmptyState title="Select a location" description="Choose a company location to view and download the PDF." />
        </div>
      ) : !selectedRow ? (
        <div className="card">
          <EmptyState title="Location not found" description="This location is no longer in the list for the selected date." />
        </div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {corpLocationName(selectedRow) || `Location ${corpLocationId(selectedRow)}`}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Professionals: <strong>{selectedRow.professionals_count ?? 0}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge variant={selectedRow.downloaded ? 'success' : 'default'}>
                {selectedRow.downloaded ? 'Downloaded' : 'Not Downloaded'}
              </Badge>
              <Badge variant="default">Count: {selectedRow.download_count ?? 0}</Badge>
              <Button
                loading={downloadingKey === `corp-${selectedLocationId}`}
                onClick={() => onDownload(selectedLocationId)}
              >
                Download PDF
              </Button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
            Last downloaded: {formatDateTime(selectedRow.last_downloaded_at)}
          </p>
        </div>
      )}
    </div>
  );
}
