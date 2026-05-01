const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Token management
const TokenService = {
  getAccessToken: () => localStorage.getItem('admin_access_token'),
  getRefreshToken: () => localStorage.getItem('admin_refresh_token'),
  setTokens: (access, refresh) => {
    localStorage.setItem('admin_access_token', access);
    if (refresh) localStorage.setItem('admin_refresh_token', refresh);
  },
  clear: () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
  },
  setUser: (user) => localStorage.setItem('admin_user', JSON.stringify(user)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return null; }
  },
};

const requestCache = new Map();

// Core fetch wrapper
async function request(endpoint, options = {}) {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cacheKey = endpoint;

  // Simple 5-second cache to prevent React Strict Mode double-firing and hitting rate limits
  if (isGet && requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey);
    if (Date.now() - cached.time < 5000) {
      return cached.data;
    }
  }

  // Clear cache on any mutation (POST, PUT, DELETE, PATCH)
  if (!isGet) {
    requestCache.clear();
  }

  const token = TokenService.getAccessToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = { ...options, headers };
  if (options.body && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !options._retry) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/admin/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: TokenService.getRefreshToken() }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          TokenService.setTokens(refreshData.data?.accessToken, refreshData.data?.refreshToken);
          return request(endpoint, { ...options, _retry: true });
        }
      } catch {}
      TokenService.clear();
      window.location.href = '/login';
    }
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  if (isGet) {
    requestCache.set(cacheKey, { time: Date.now(), data });
  }

  return data;
}

// ─── Admin Auth APIs ──────────────────────────────────────────────────────────
// POST /api/admin/auth/login        Body: { phoneNumber, password }
// POST /api/admin/auth/verify-otp   Body: { phoneNumber, code }
//   Response: { data: { accessToken, refreshToken, user: { id, phoneNumber, isLoggedIn, lastLogin } } }
// POST /api/admin/auth/logout       (Bearer required)
// POST /api/admin/auth/refresh      Body: { refreshToken }
//   Response: { data: { accessToken, refreshToken } }
export const adminAuthAPI = {
  login: (phone, password, username) =>
    request('/api/admin/auth/login', {
      method: 'POST',
      body: { phoneNumber: phone, password, username },
    }),

  verifyOTP: (phone, otp) =>
    request('/api/admin/auth/verify-otp', {
      method: 'POST',
      body: { phoneNumber: phone, code: otp },
    }),

  logout: () =>
    request('/api/admin/auth/logout', { method: 'POST' }),

  refresh: () =>
    request('/api/admin/auth/refresh', {
      method: 'POST',
      body: { refreshToken: TokenService.getRefreshToken() },
    }),
};

// ─── Admin Dashboard APIs ─────────────────────────────────────────────────────
export const adminDashboardAPI = {
  getStats: () => request('/api/admin/dashboard'),
};

// ─── Admin Analytics APIs ─────────────────────────────────────────────────────
export const adminAnalyticsAPI = {
  getOverview: () => request('/api/admin/subscriptions/analytics/overview'),
  getBySchool: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/by-school${q ? `?${q}` : ''}`);
  },
  getChildrenBySchool: (schoolId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/school/${schoolId}/children${q ? `?${q}` : ''}`);
  },
  getTeacherSubscriptions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/teachers${q ? `?${q}` : ''}`);
  },
  getProfessionalSubscriptions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/professionals${q ? `?${q}` : ''}`);
  },
  getExpiringSoon: (days = 7, entityType = '') => {
    const q = new URLSearchParams({ days, entityType }).toString();
    return request(`/api/admin/subscriptions/analytics/expiring-soon?${q}`);
  },
  getAllMembersStatus: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/all-members${q ? `?${q}` : ''}`);
  },
  getActiveMealStatus: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/active-meal-status${q ? `?${q}` : ''}`);
  },
  getNotSubscribed: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/subscriptions/analytics/not-subscribed${q ? `?${q}` : ''}`);
  },
};

// ─── Admin Schools APIs ───────────────────────────────────────────────────────
// Fields: name*, address*, city*, state*, pincode*, country
// Response GET list: { data: { schools: [], pagination: { currentPage, totalPages, totalItems, itemsPerPage } } }
// Response GET/POST/PUT: { data: { school: {} } }
// Query params: page, limit, search
export const adminSchoolsAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/schools${q ? `?${q}` : ''}`);
  },
  getById: (id) => request(`/api/admin/schools/${id}`),
  create: (data) => request('/api/admin/schools', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/schools/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/api/admin/schools/${id}`, { method: 'DELETE' }),
};

// ─── Admin Subscriptions APIs ─────────────────────────────────────────────────
// Fields: plan_name*, price*, billing_cycle*, trial_days, display_order, is_active
// Response POST/PUT: { data: {} } (flat row)
// Response DELETE: { data: { id } }
export const adminSubscriptionsAPI = {
  getAll: () => request('/api/admin/subscriptions'),
  getById: (id) => request(`/api/admin/subscriptions/${id}`),
  create: (data) => request('/api/admin/subscriptions', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/subscriptions/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/api/admin/subscriptions/${id}`, { method: 'DELETE' }),
  cancelClientSubscription: (subscriptionId) =>
    request(`/api/admin/subscriptions/client-subscription/${subscriptionId}`, { method: 'DELETE' }),
};

export const adminTrialPlansAPI = {
  getAll: () => request('/api/admin/trial-plans'),
  getById: (id) => request(`/api/admin/trial-plans/${id}`),
  create: (data) => request('/api/admin/trial-plans', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/trial-plans/${id}`, { method: 'PUT', body: data }),
  setStatus: (id, isActive) => request(`/api/admin/trial-plans/${id}/status`, { method: 'PATCH', body: { isActive } }),
  delete: (id) => request(`/api/admin/trial-plans/${id}`, { method: 'DELETE' }),
};

// ─── Admin Menu APIs ──────────────────────────────────────────────────────────
// Upload: multipart/form-data, fields: image (file), menu_date, items
// DB columns: image_url, image_public_id, items, menu_date
// PUT /api/admin/menu/:date    body: form-data { image?, items, is_active }
// DELETE /api/admin/menu/:date
export const adminMenuAPI = {
  upload: (formData) =>
    request('/api/admin/menu/upload', { method: 'POST', body: formData }),
  update: (date, formData) =>
    request(`/api/admin/menu/${date}`, { method: 'PUT', body: formData }),
  delete: (date) =>
    request(`/api/admin/menu/${date}`, { method: 'DELETE' }),
};

// ─── Admin Meals APIs ────────────────────────────────────────────────────────
export const adminMealsAPI = {
  reduceToday: () => request('/api/admin/meals/reduce-today', { method: 'POST' }),
  getReductionHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/meals/reduction-history${q ? `?${q}` : ''}`);
  },
  getDailyLog: (date = 'today') => request(`/api/admin/meals/daily-log/${date}`),
  getKitchenReport: () => request('/api/admin/meals/kitchen-report/today'),
  getTokensAll: () => `${BASE_URL}/api/admin/meals/tokens/all?token=${TokenService.getAccessToken()}`,
};

// ─── Admin Corporate Locations APIs ──────────────────────────────────────────
// Required: name*, address*, city*, state*   Optional: is_active
// Response: { data: {} } (flat row)
export const adminCorporateAPI = {
  create: (data) =>
    request('/api/admin/corporate-locations', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/api/admin/corporate-locations/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/api/admin/corporate-locations/${id}`, { method: 'DELETE' }),
  setStatus: (id, isActive) =>
    request(`/api/admin/corporate-locations/${id}/status`, { method: 'PATCH', body: { is_active: isActive } }),
};

export const adminPaymentAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/payment/all${q ? `?${q}` : ''}`);
  },
  getStats: () => request('/api/admin/payment/stats'),
};

// ─── Admin Homepage APIs ─────────────────────────────────────────────────────
// POST /api/admin/homepage            Body: { name, description, display_order }
// PUT  /api/admin/homepage/:id        Body: { name?, description?, display_order?, is_active? }
// DELETE /api/admin/homepage/:id
// GET  /api/common/homepage           (public read — no auth needed)
export const adminHomepageAPI = {
  getAll: () => request('/api/common/homepage'),
  create: (data) => request('/api/admin/homepage', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/homepage/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/api/admin/homepage/${id}`, { method: 'DELETE' }),
};

// ─── Admin Lookup APIs ────────────────────────────────────────────────────────
// Response: { data: { mealSizes: [] } }  |  { data: { standards: [] } }
export const adminLookupAPI = {
  getMealSizes: () => request('/api/admin/lookup/meal-sizes'),
  getStandards: () => request('/api/admin/lookup/standards'),
};

export const adminMasterDataAPI = {
  getAllStates: () => request('/api/admin/lookup/states'),
  createState: (data) => request('/api/admin/lookup/states', { method: 'POST', body: data }),
  updateState: (id, data) => request(`/api/admin/lookup/states/${id}`, { method: 'PUT', body: data }),
  deleteState: (id) => request(`/api/admin/lookup/states/${id}`, { method: 'DELETE' }),

  getAllCities: () => request('/api/admin/lookup/cities'),
  createCity: (data) => request('/api/admin/lookup/cities', { method: 'POST', body: data }),
  updateCity: (id, data) => request(`/api/admin/lookup/cities/${id}`, { method: 'PUT', body: data }),
  deleteCity: (id) => request(`/api/admin/lookup/cities/${id}`, { method: 'DELETE' }),

  getAllMealSizes: () => request('/api/admin/lookup/meal-sizes'),
  createMealSize: (data) => request('/api/admin/lookup/meal-sizes', { method: 'POST', body: data }),
  updateMealSize: (id, data) => request(`/api/admin/lookup/meal-sizes/${id}`, { method: 'PUT', body: data }),
  deleteMealSize: (id) => request(`/api/admin/lookup/meal-sizes/${id}`, { method: 'DELETE' }),

  getAllStandards: () => request('/api/admin/lookup/standards'),
};

// ─── Common APIs ──────────────────────────────────────────────────────────────
// GET /api/common/subscriptions          Response: { count, data: [] }
// GET /api/common/subscriptions/:id      Response: { data: {} }
// GET /api/common/corporate-locations    Response: { count, data: [] }
// GET /api/common/menu/history/all       Response: { count, data: [] }
//   Menu row: { id, image_url, items, menu_date, created_at }
// GET /api/common/menu/:date             Response: { data: {} }
// GET /api/common/schools                (via commonRoutes)
// GET /api/common/lookup/meal-sizes      Response: { data: { mealSizes: [] } }
// GET /api/common/lookup/standards       Response: { data: { standards: [] } }
export const commonAPI = {
  getSchools: () => request('/api/common/schools'),
  getMealSizes: () => request('/api/common/lookup/meal-sizes'),
  getStandards: () => request('/api/common/lookup/standards'),
  getStates: () => request('/api/common/lookup/states'),
  getCities: (stateId) => request(`/api/common/lookup/cities${stateId ? `?stateId=${stateId}` : ''}`),
  getCorporateLocations: () => request('/api/common/corporate-locations'),
  getSubscriptions: () => request('/api/common/subscriptions'),
  getSubscriptionById: (id) => request(`/api/common/subscriptions/${id}`),
  getMenuHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/common/menu/history/all${q ? `?${q}` : ''}`);
  },
  getMenuByDate: (date) => request(`/api/common/menu/${date}`),
};

export { TokenService };
export default request;
