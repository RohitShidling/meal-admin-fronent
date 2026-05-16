import { useState, useEffect, useCallback } from 'react';
import { adminPaymentAPI, adminSchoolsAPI } from '../services/api';
import { Spinner, EmptyState, Badge, Button } from '../components/FormElements';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const PAGE_SIZE = 20;

const STATUS_COLORS = {
  success: 'success',
  completed: 'success',
  pending: 'warning',
  pending_checkout: 'warning',
  failed: 'danger',
  cancelled: 'secondary',
};

const STATUS_LABELS = {
  pending_checkout: 'Pending checkout',
};

const ENTITY_LABELS = {
  student: 'Student',
  child: 'Student',
  teacher: 'Teacher',
  professional: 'Professional',
  professional_worker: 'Professional Worker',
  'professional worker': 'Professional Worker',
  cart: 'Cart',
};

function canonicalSector(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'child' || raw === 'student') return 'student';
  if (raw === 'teacher') return 'teacher';
  if (raw === 'professional' || raw === 'professional_worker' || raw === 'professional worker') return 'professional_worker';
  return raw;
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: PAGE_SIZE });
  
  // Filters
  const [filters, setFilters] = useState({
    schoolId: '',
    entityType: '',
    planType: '',
    mealSize: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: PAGE_SIZE,
  });

  const buildPaymentQuery = (f, options = {}) => {
    const page = Number(options.page || f.page || 1);
    const limit = Number(options.limit || f.limit || PAGE_SIZE);

    const q = {
      page,
      limit,
      schoolId: f.schoolId,
      entityType: f.entityType,
      planType: f.planType,
      mealSize: f.mealSize,
      status: f.status,
      startDate: f.startDate,
      endDate: f.endDate,
      search: f.search,
    };

    // Remove empty strings just in case.
    Object.keys(q).forEach((k) => {
      if (q[k] === '') delete q[k];
    });
    return q;
  };

  const normalizeRow = (row) => {
    const normalizedSector = canonicalSector(row.sector ?? row.entity_type ?? row.entityType);
    const createdAt = row.paymentDate ?? row.created_at ?? row.createdAt ?? row.date ?? null;
    const customerName =
      row.customerName ??
      row.customer_name ??
      row.entity_name ??
      '—';
    const cleanedName = String(customerName || '').trim();
    const orderStatusRaw = String(row.order_status ?? row.status ?? '').toLowerCase();
    const paymentStatusRaw = String(row.payment_status ?? row.paymentStatus ?? '').toLowerCase();
    const canonicalStatus =
      orderStatusRaw
      || (paymentStatusRaw === 'success' ? 'completed' : paymentStatusRaw)
      || 'unknown';
    const isCartOrder = Boolean(row.isCartOrder ?? row.is_cart_order ?? false);

    return {
      ...row,
      _orderId: row.order_id ?? row.orderId ?? '—',
      _createdAt: createdAt,
      _customerName: cleanedName.toLowerCase() === 'cart order' ? '—' : (cleanedName || '—'),
      _schoolName: row.schoolName ?? row.school_name ?? null,
      _corporateName: row.corporate_location_name ?? row.corporateLocationName ?? null,
      _phone: row.client_phone ?? row.phone ?? row.phone_number ?? row.customerPhone ?? '—',
      _plan: row.subscription_name ?? row.plan_name ?? row.planName ?? '—',
      _sector: normalizedSector || '',
      _status: canonicalStatus,
      _paymentStatus: paymentStatusRaw || null,
      _amount: Number(row.amount ?? row.unit_price ?? 0) || 0,
      _schoolId: row.school_id ?? row.schoolId ?? null,
      _isCartOrder: isCartOrder,
      _sectorLabel: String(row.sector_label ?? '').trim(),
    };
  };

  const getPageItems = (totalPages, currentPage) => {
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
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, schoolsRes, response] = await Promise.all([
        adminPaymentAPI.getStats(),
        adminSchoolsAPI.getAll({ limit: 300 }),
        adminPaymentAPI.getAll(buildPaymentQuery(filters)),
      ]);
      const rows = Array.isArray(response?.data) ? response.data : [];
      const normalizedRows = rows.map(normalizeRow);
      const p = response?.pagination || {};
      const currentPage = Number(p.page ?? filters.page ?? 1) || 1;
      const totalPages = Number(p.totalPages ?? 1) || 1;
      const totalItems = Number(p.total ?? normalizedRows.length) || normalizedRows.length;
      const itemsPerPage = Number(p.limit ?? PAGE_SIZE) || PAGE_SIZE;
      setPayments(normalizedRows);
      setPagination({ currentPage, totalPages, totalItems, itemsPerPage });
      setStats(statsRes.data || null);
      setSchools(schoolsRes.data?.schools || schoolsRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Enforce 20 rows/page always.
  useEffect(() => {
    if (filters.limit !== PAGE_SIZE) {
      setFilters((prev) => ({ ...prev, limit: PAGE_SIZE, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: Math.min(Math.max(1, Number(newPage) || 1), pagination.totalPages || 1),
    }));
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerName = (row) => {
    const fromApi = row._customerName ?? row.customerName ?? row.customer_name;
    if (fromApi && String(fromApi).trim()) return String(fromApi).trim();
    const legacy = row.entity_name ?? row.customer_name ?? '';
    if (String(legacy).trim().toLowerCase() === 'cart order') return '—';
    return String(legacy || '—').trim() || '—';
  };

  const getSectorLabel = (row) => {
    const apiLabel = String(row._sectorLabel ?? row.sector_label ?? '').trim();
    if (apiLabel && !/^cart$/i.test(apiLabel) && !/^mixed$/i.test(apiLabel)) return apiLabel;
    const sector = canonicalSector(row._sector ?? row.sector ?? row.entity_type ?? row.entityType);
    if (!sector) return '—';
    if (sector === 'cart' || sector === 'mixed') {
      const fallbackFromEntity = canonicalSector(row.entity_type ?? row.entityType);
      return ENTITY_LABELS[fallbackFromEntity] || '—';
    }
    return ENTITY_LABELS[sector] || sector.replace(/_/g, ' ');
  };

  const getSubLabel = (row) => {
    return row._schoolName || row.schoolName || row.school_name || row._corporateName || row.corporate_location_name || row.corporateLocationName || '—';
  };

  return (
    <div className="payments-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments & Revenue</h1>
          <p className="page-subtitle">Track transactions and monitor revenue across all sectors</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.overall.total_revenue)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.overall.total_orders}</div>
              <div className="stat-label">Total Transactions</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.overall.pending_orders}</div>
              <div className="stat-label">Pending Payments</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.overall.failed_orders}</div>
              <div className="stat-label">Failed/Cancelled</div>
            </div>
          </div>
        </div>
      )}


      {/* Filters Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>School Filter</label>
            <select 
              value={filters.schoolId} 
              onChange={(e) => handleFilterChange('schoolId', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <option value="">All Schools</option>
              {schools.map((s) => {
                const id = s.id ?? s.school_id ?? s.schoolId;
                const name = s.name ?? s.school_name ?? s.schoolName ?? `School ${id}`;
                if (id == null) return null;
                return <option key={id} value={id}>{name}</option>;
              })}
            </select>
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Sector</label>
            <select 
              value={filters.entityType} 
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <option value="">All Sectors</option>
              <option value="child">School Students</option>
              <option value="teacher">Teachers</option>
              <option value="professional">Working Professionals</option>
            </select>
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending_checkout">Pending checkout</option>
            </select>
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Plan Type</label>
            <select
              value={filters.planType}
              onChange={(e) => handleFilterChange('planType', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <option value="">All Plan Types</option>
              <option value="trial">Trial Plan</option>
              <option value="regular">Regular Plan</option>
            </select>
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Meal Size</label>
            <select
              value={filters.mealSize}
              onChange={(e) => handleFilterChange('mealSize', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <option value="">All Meal Sizes</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>From Date</label>
            <input 
              type="date" 
              value={filters.startDate} 
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>To Date</label>
            <input 
              type="date" 
              value={filters.endDate} 
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Search</label>
            <input
              type="text"
              placeholder="Order, customer, phone, plan"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>
        ) : payments.length === 0 ? (
          <EmptyState 
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            title="No payments found" 
            description="Adjust your filters to see transactions" 
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date & Time</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Plan</th>
                  <th>Sector</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={`${p.id || p.order_id}-${p.entity_id || p.customerName || p.entity_name || idx}`}>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{p._orderId || p.order_id}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(p._createdAt || p.created_at)}</td>
                    <td>
                      <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p._isCartOrder && <span style={{ color: 'var(--danger)', fontWeight: 800 }}>*</span>}
                        <span>{getCustomerName(p)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getSubLabel(p)}</div>
                    </td>
                    <td>{p._phone || p.client_phone || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p._plan || p.subscription_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {(p.planType || '').toUpperCase()} {p.mealVariant ? `• ${p.mealVariant}` : ''}
                      </div>
                    </td>
                    <td><Badge variant="ghost">{p.sector_label || getSectorLabel(p)}</Badge></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p._amount ?? p.amount)}</td>
                    <td>
                      <Badge variant={STATUS_COLORS[p._status ?? p.order_status] || 'secondary'}>
                        {STATUS_LABELS[p._status] || p._status || p.order_status || 'unknown'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="pagination">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <div className="pagination-pages">
              {getPageItems(pagination.totalPages, pagination.currentPage).map((item, idx) => {
                if (item === '…') {
                  return <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>;
                }
                const page = item;
                return (
                  <button
                    key={page}
                    type="button"
                    className={`page-num ${page === pagination.currentPage ? 'page-num-active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
