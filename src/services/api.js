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
    // Only attempt refresh for 401s on non-auth endpoints
    const isAuthEndpoint = endpoint.includes('/api/admin/auth/');
    
    if (res.status === 401 && !options._retry && !isAuthEndpoint) {
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
      
      // If refresh fails, clear and redirect
      TokenService.clear();
      window.location.href = '/login';
    }
    
    // For 401 on login/auth, or if refresh failed, we just throw the error
    // so the caller (like AuthContext) can handle it.
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

async function requestBlob(endpoint, options = {}) {
  const token = TokenService.getAccessToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return {
    blob: await res.blob(),
    headers: res.headers,
  };
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

  verifyOTP: (phone, otp, challengeToken) =>
    request('/api/admin/auth/verify-otp', {
      method: 'POST',
      body: { phoneNumber: phone, code: otp, challengeToken },
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
  getAll: () => request('/api/admin/subscription-plan-days'),
  getById: (id) => request(`/api/admin/subscription-plan-days/${id}`),
  create: (data) => request('/api/admin/subscription-plan-days', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/subscription-plan-days/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/api/admin/subscriptions/${id}`, { method: 'DELETE' }),
  cancelClientSubscription: (subscriptionId) =>
    request(`/api/admin/subscriptions/client-subscription/${subscriptionId}`, { method: 'DELETE' }),
};

function tokenDateQuery(date) {
  const d = date != null && String(date).trim() !== '' ? String(date).trim() : '';
  return d ? `?${new URLSearchParams({ date: d }).toString()}` : '';
}

function encodeRequiredId(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return encodeURIComponent(String(value).trim());
}

function encodeMealSizeId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error('mealSizeId must be numeric');
  }
  return encodeURIComponent(normalized);
}

export const adminTokenAPI = {
  getSchools: (date) => request(`/api/admin/tokens/schools${tokenDateQuery(date)}`),
  getSchoolsPanel: (date) => request(`/api/admin/tokens/schools/panel${tokenDateQuery(date)}`),
  downloadSchoolPdf: (schoolId, date) =>
    requestBlob(`/api/admin/tokens/schools/${encodeRequiredId(schoolId, 'schoolId')}/pdf${tokenDateQuery(date)}`),
  getSchoolMealSize: (schoolId, mealSizeId, date, includeTokens = false) =>
    request(`/api/admin/tokens/schools/${encodeRequiredId(schoolId, 'schoolId')}/meal-sizes/${encodeMealSizeId(mealSizeId)}${tokenDateQuery(date)}${includeTokens ? `${tokenDateQuery(date) ? '&' : '?'}includeTokens=true` : ''}`),
  downloadSchoolMealSizePdf: (schoolId, mealSizeId, date) =>
    requestBlob(`/api/admin/tokens/schools/${encodeRequiredId(schoolId, 'schoolId')}/meal-sizes/${encodeMealSizeId(mealSizeId)}/pdf${tokenDateQuery(date)}`),

  getCorporate: (date) => request(`/api/admin/tokens/corporate${tokenDateQuery(date)}`),
  getCorporateLocation: (locationId, date) =>
    request(`/api/admin/tokens/corporate/${encodeRequiredId(locationId, 'locationId')}${tokenDateQuery(date)}`),
  downloadCorporatePdf: (locationId, date) =>
    requestBlob(`/api/admin/tokens/corporate/${encodeRequiredId(locationId, 'locationId')}/pdf${tokenDateQuery(date)}`),
  exportSchoolsPdf: (date) => requestBlob(`/api/admin/tokens/export/schools/pdf${tokenDateQuery(date)}`),
  exportCorporatePdf: (date) => requestBlob(`/api/admin/tokens/export/corporate/pdf${tokenDateQuery(date)}`),
  exportAllPdf: (date) => requestBlob(`/api/admin/tokens/export/all/pdf${tokenDateQuery(date)}`),

  getSkipPolicy: () => request('/api/admin/tokens/skip-policy'),
  updateSkipPolicy: (data) => request('/api/admin/tokens/skip-policy', { method: 'PUT', body: data }),

  addExtraMeals: (subscriptionId, data) =>
    request(`/api/admin/tokens/subscriptions/${subscriptionId}/extra-meals`, { method: 'POST', body: data }),
};

export const adminTrialPlansAPI = {
  getAll: () => request('/api/admin/trial-plan-features'),
  getById: (id) => request(`/api/admin/trial-plan-features/${id}`),
  create: (data) => request('/api/admin/trial-plan-features', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/trial-plan-features/${id}`, { method: 'PUT', body: data }),
  setStatus: (id, isActive) => request(`/api/admin/trial-plan-features/${id}/status`, { method: 'PATCH', body: { is_active: isActive } }),
  delete: (id) => request(`/api/admin/trial-plan-features/${id}`, { method: 'DELETE' }),
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

export const adminMenuNutritionAPI = {
  upsert: (data) => request('/api/admin/menu-nutrition', { method: 'POST', body: data }),
  getByDate: (date) => request(`/api/admin/menu-nutrition/${date}`),
  getHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/menu-nutrition/history/all${q ? `?${q}` : ''}`);
  },
};

// ─── Admin Meals APIs ────────────────────────────────────────────────────────
export const adminMealsAPI = {
  reduceToday: () => request('/api/admin/meals/reduce-today', { method: 'POST' }),
  reverseReduceToday: () => request('/api/admin/meals/reduce-today/reverse', { method: 'POST' }),
  getUsers: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value === undefined || value === null || value === '') return acc;
        acc[key] = String(value);
        return acc;
      }, {})
    ).toString();
    return request(`/api/admin/meals/users${q ? `?${q}` : ''}`);
  },
  addRemainingMeals: (entityType, entityId, body) =>
    request(`/api/admin/meals/users/${encodeRequiredId(entityType, 'entityType')}/${encodeRequiredId(entityId, 'entityId')}/add-remaining-meals`, {
      method: 'POST',
      body,
    }),
  getReductionHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/meals/reduction-history${q ? `?${q}` : ''}`);
  },
  getDailyLog: (date = 'today') => request(`/api/admin/meals/daily-log/${date}`),
  getKitchenReport: () => request('/api/admin/meals/kitchen-report/today'),
  getTokensAll: () => `${BASE_URL}/api/admin/meals/tokens/all?token=${TokenService.getAccessToken()}`,
};

// ─── Admin Corporate Locations APIs ──────────────────────────────────────────
// GET  /api/admin/corporate-locations              Get all corporate locations
// POST /api/admin/corporate-locations              Body: { name*, address*, city*, state*, is_active }
// PUT  /api/admin/corporate-locations/{id}         Body: { name?, address?, city?, state?, is_active? }
// DELETE /api/admin/corporate-locations/{id}       Delete a location
export const adminCorporateAPI = {
  getAll: () => request('/api/admin/corporate-locations'),
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
// GET  /api/admin/homepage            Returns both active and inactive sections (includes entity_name)
// POST /api/admin/homepage            Body: { entity_id, name, description, display_order }
// PUT  /api/admin/homepage/:id        Body: { entity_id?, name?, description?, display_order?, is_active? }
// DELETE /api/admin/homepage/:id
export const adminHomepageAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/homepage${q ? `?${q}` : ''}`);
  },
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

// ─── Admin Entities APIs ─────────────────────────────────────────────────────
// GET  /api/admin/entities           Get all entities (including inactive)
// POST /api/admin/entities           Create a new entity (Body: { name })
// PUT  /api/admin/entities/{id}      Update an entity (Body: { name?, is_active? })
// DELETE /api/admin/entities/{id}    Delete an entity
export const adminEntitiesAPI = {
  getAll: () => request('/api/admin/entities'),
  create: (data) => request('/api/admin/entities', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/admin/entities/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/api/admin/entities/${id}`, { method: 'DELETE' }),
};

// ─── Common APIs ──────────────────────────────────────────────────────────────
// GET /api/common/subscriptions          Response: { count, data: [] }
// GET /api/common/subscriptions/:id      Response: { data: {} }
// GET /api/common/corporate-locations    Response: { count, data: [] }
// GET /api/common/menu/history/all       Response: { count, data: [] }
//   Menu row: { id, image_url, items, menu_date, created_at }
// GET /api/common/menu/:date             Response: { data: {} }
// GET /api/admin/schools                 Get all schools with pagination and search
//   Query params: page (default 1), limit (default 10), search
//   Response: { success, message, data: { schools: [], pagination: { currentPage, totalPages, totalItems, itemsPerPage } } }
// GET /api/common/lookup/meal-sizes      Response: { data: { mealSizes: [] } }
// GET /api/common/lookup/standards       Response: { data: { standards: [] } }
export const commonAPI = {
  getSchools: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/schools${q ? `?${q}` : ''}`);
  },
  getMealSizes: () => request('/api/common/lookup/meal-sizes'),
  getStandards: () => request('/api/common/lookup/standards'),
  getStates: () => request('/api/common/lookup/states'),
  getCities: (stateId) => request(`/api/common/lookup/cities${stateId ? `?stateId=${stateId}` : ''}`),
  getEntities: () => request('/api/admin/entities'),
  getCorporateLocations: () => request('/api/common/corporate-locations'),
  getSubscriptions: () => request('/api/common/subscription-plan-days'),
  getSubscriptionById: (id) => request(`/api/common/subscription-plan-days/${id}`),
  getMenuHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/common/menu/history/all${q ? `?${q}` : ''}`);
  },
  getMenuByDate: (date) => request(`/api/common/menu/${date}`),
};

export { TokenService };
export default request;
