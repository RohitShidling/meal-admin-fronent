import { useState, useEffect, useCallback } from 'react';
import { adminPaymentAPI, adminSchoolsAPI } from '../services/api';
import { Spinner, EmptyState, Badge, Button } from '../components/FormElements';
import { toast } from '../components/Toast';
import '../components/Layout.css';

const STATUS_COLORS = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'secondary',
};

const ENTITY_LABELS = {
  child: 'Student',
  teacher: 'Teacher',
  professional: 'Professional',
  cart: 'Cart',
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  
  // Filters
  const [filters, setFilters] = useState({
    schoolId: '',
    entityType: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, statsRes, schoolsRes] = await Promise.all([
        adminPaymentAPI.getAll(filters),
        adminPaymentAPI.getStats(),
        adminSchoolsAPI.getAll({ limit: 100 }), // Fetch more to populate filter

      ]);

      setPayments(paymentsRes.data || []);
      setPagination({
        currentPage: paymentsRes.pagination?.page || 1,
        totalPages: paymentsRes.pagination?.totalPages || 1,
      });
      setStats(statsRes.data || null);
      setSchools(schoolsRes.data?.schools || schoolsRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{p.order_id}</td>
                    <td style={{ fontSize: 13 }}>
                      <div>{formatDate(p.created_at)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Start: {p.subscription_start_date ? formatDate(p.subscription_start_date) : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.entity_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.school_name || p.corporate_location_name || '—'}</div>
                    </td>
                    <td>{p.client_phone || '—'}</td>
                    <td>{p.subscription_name}</td>
                    <td><Badge variant="ghost">{p.sector_label || ENTITY_LABELS[p.entity_type] || p.entity_type}</Badge></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td>
                      <Badge variant={STATUS_COLORS[p.order_status] || 'secondary'}>
                        {p.order_status || 'unknown'}
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
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page} 
                  className={`page-num ${page === pagination.currentPage ? 'page-num-active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
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
