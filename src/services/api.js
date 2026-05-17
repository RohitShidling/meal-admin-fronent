const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** When true, backend sets HttpOnly refresh cookie (ADMIN_REFRESH_HTTPONLY_COOKIE); enable CORS credentials + same env on Vite. */
const USE_REFRESH_HTTPONLY_COOKIE = import.meta.env.VITE_ADMIN_REFRESH_HTTPONLY_COOKIE === 'true';

/** localStorage keeps admin signed in across tab close; sessionStorage is migrated once. */
const TOKEN_STORAGE = typeof localStorage !== 'undefined' ? localStorage : sessionStorage;

const migrateLegacyAdminTokens = () => {
  if (typeof sessionStorage === 'undefined') return;
  const keys = ['admin_access_token', 'admin_refresh_token', 'admin_user'];
  keys.forEach((key) => {
    try {
      if (!TOKEN_STORAGE.getItem(key)) {
        const legacy = sessionStorage.getItem(key);
        if (legacy) TOKEN_STORAGE.setItem(key, legacy);
      }
    } catch {
      /* ignore */
    }
  });
};
migrateLegacyAdminTokens();

const decodeJwtPayload = (token) => {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/** True when access token is missing or expires within bufferMs (default 5 min). */
export function isAccessTokenExpiringSoon(bufferMs = 5 * 60 * 1000) {
  const token = TokenService.getAccessToken();
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - bufferMs;
}

export function isAccessTokenExpired() {
  const token = TokenService.getAccessToken();
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshBody = USE_REFRESH_HTTPONLY_COOKIE
      ? {}
      : { refreshToken: TokenService.getRefreshToken() };
    const refreshRes = await fetch(`${BASE_URL}/api/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: fetchCredentials(),
      body: JSON.stringify(refreshBody),
    });
    const refreshData = await refreshRes.json().catch(() => ({}));
    if (!refreshRes.ok) {
      const error = new Error(refreshData.message || `HTTP ${refreshRes.status}`);
      error.status = refreshRes.status;
      error.data = refreshData;
      throw error;
    }
    TokenService.setTokens(refreshData.data?.accessToken, refreshData.data?.refreshToken);
    return refreshData;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

const apiOriginDiffers = () => {
  try {
    return new URL(BASE_URL).origin !== window.location.origin;
  } catch {
    return true;
  }
};

const fetchCredentials = () =>
  USE_REFRESH_HTTPONLY_COOKIE || apiOriginDiffers() ? 'include' : 'same-origin';

/** Dispatched when refresh fails; AuthContext clears local session. */
export const SESSION_EXPIRED_EVENT = 'admin:session-expired';

const notifySessionExpired = () => {
  TokenService.clear();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

/** Clear session and send user to login (used when access token is no longer valid). */
export function redirectToLogin() {
  if (!isAccessTokenExpired()) return;
  notifySessionExpired();
}

// Token management — localStorage for persistence; refresh in HttpOnly cookie when enabled
const TokenService = {
  getAccessToken: () => TOKEN_STORAGE.getItem('admin_access_token'),
  getRefreshToken: () => {
    if (USE_REFRESH_HTTPONLY_COOKIE) return null;
    return TOKEN_STORAGE.getItem('admin_refresh_token');
  },
  setTokens: (access, refresh) => {
    if (access) TOKEN_STORAGE.setItem('admin_access_token', access);
    if (USE_REFRESH_HTTPONLY_COOKIE) {
      try {
        TOKEN_STORAGE.removeItem('admin_refresh_token');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('admin_refresh_token');
        }
      } catch (_e) {
        /* ignore */
      }
    } else if (refresh) {
      TOKEN_STORAGE.setItem('admin_refresh_token', refresh);
    }
  },
  clear: () => {
    try {
      TOKEN_STORAGE.removeItem('admin_access_token');
      TOKEN_STORAGE.removeItem('admin_refresh_token');
      TOKEN_STORAGE.removeItem('admin_user');
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
    } catch (_e) {
      /* ignore */
    }
  },
  setUser: (user) => {
    try {
      localStorage.removeItem('admin_user');
    } catch (_e) {
      /* ignore */
    }
    TOKEN_STORAGE.setItem('admin_user', JSON.stringify(user));
  },
  getUser: () => {
    try {
      const s = TOKEN_STORAGE.getItem('admin_user');
      if (s) return JSON.parse(s);
      const legacy = localStorage.getItem('admin_user');
      if (legacy) {
        TOKEN_STORAGE.setItem('admin_user', legacy);
        localStorage.removeItem('admin_user');
        return JSON.parse(legacy);
      }
    } catch {
      return null;
    }
    return null;
  },
};

const requestCache = new Map();
const PERSIST_CACHE_PREFIX = 'admin_api_cache_v1:';
const PERSIST_CACHE_TTL_DEFAULT_MS = Number(import.meta.env.VITE_PERSIST_CACHE_TTL_MS) || 1000 * 60 * 60 * 6; // 6h
const PERSIST_CACHE_TTL_MUTABLE_MS = Number(import.meta.env.VITE_PERSIST_CACHE_MUTABLE_TTL_MS) || 1000 * 60 * 2; // 2m menus/prices/schools etc.

/** In-memory image data URLs only (B3 — avoid large / shared-machine localStorage). */
const imageDataUrlCache = new Map();
const imageCacheLruOrder = [];
const IMAGE_CACHE_MAX_ENTRIES = 15;
const IMAGE_MAX_BYTES = 150 * 1024;

function persistCacheTtlMs(endpoint) {
  const ep = String(endpoint || '');
  if (
    /\/api\/admin\/(menu|subscriptions|subscription-plan|schools|homepage|entities|payment|meals|corporate|lookup|trial|tokens|menu-nutrition)/i.test(
      ep
    )
  ) {
    return PERSIST_CACHE_TTL_MUTABLE_MS;
  }
  return PERSIST_CACHE_TTL_DEFAULT_MS;
}

function getPersistCacheKey(endpoint) {
  return `${PERSIST_CACHE_PREFIX}${endpoint}`;
}

function readPersistCache(endpoint) {
  try {
    const raw = localStorage.getItem(getPersistCacheKey(endpoint));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.time !== 'number' || !('data' in parsed)) return null;
    if (Date.now() - parsed.time > persistCacheTtlMs(endpoint)) {
      localStorage.removeItem(getPersistCacheKey(endpoint));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writePersistCache(endpoint, data) {
  try {
    localStorage.setItem(
      getPersistCacheKey(endpoint),
      JSON.stringify({ time: Date.now(), data })
    );
  } catch {
    // Ignore storage full / serialization issues
  }
}

function isLikelyNetworkError(error) {
  if (!error) return false;
  if (error.name === 'TypeError') return true;
  return /network|fetch|offline|failed/i.test(String(error.message || ''));
}

function collectImageUrls(value, out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, out));
    return out;
  }

  Object.entries(value).forEach(([key, v]) => {
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('image') ||
        lowerKey.includes('logo') ||
        lowerKey.includes('thumbnail') ||
        /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(v)
      ) {
        out.add(v);
      }
    } else if (v && typeof v === 'object') {
      collectImageUrls(v, out);
    }
  });

  return out;
}

function touchImageLru(url) {
  const i = imageCacheLruOrder.indexOf(url);
  if (i >= 0) imageCacheLruOrder.splice(i, 1);
  imageCacheLruOrder.unshift(url);
  while (imageCacheLruOrder.length > IMAGE_CACHE_MAX_ENTRIES) {
    const last = imageCacheLruOrder.pop();
    if (last) imageDataUrlCache.delete(last);
  }
}

function readCachedImageDataUrl(url) {
  const hit = imageDataUrlCache.get(url);
  if (hit) touchImageLru(url);
  return hit || null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function cacheImageUrl(url) {
  try {
    if (imageDataUrlCache.has(url)) {
      touchImageLru(url);
      return;
    }
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return;
    const blob = await res.blob();
    if (blob.size > IMAGE_MAX_BYTES) return;
    const dataUrl = await blobToDataUrl(blob);
    if (typeof dataUrl !== 'string') return;
    imageDataUrlCache.set(url, dataUrl);
    touchImageLru(url);
  } catch {
    // ignore image cache failures
  }
}

function withCachedImages(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => withCachedImages(item));

  const copy = { ...value };
  Object.entries(copy).forEach(([key, v]) => {
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('image') ||
        lowerKey.includes('logo') ||
        lowerKey.includes('thumbnail') ||
        /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(v)
      ) {
        const cached = readCachedImageDataUrl(v);
        if (cached) copy[key] = cached;
      }
    } else if (v && typeof v === 'object') {
      copy[key] = withCachedImages(v);
    }
  });
  return copy;
}

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

  const config = {
    ...options,
    headers,
    credentials: options.credentials ?? fetchCredentials(),
  };
  if (options.body && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let res;
  let data;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, config);
    data = await res.json().catch(() => ({}));
  } catch (error) {
    if (isGet && isLikelyNetworkError(error)) {
      const persisted = readPersistCache(cacheKey);
      if (persisted) return persisted;
    }
    throw error;
  }

  if (!res.ok) {
    // Only attempt refresh for 401s on non-auth endpoints
    const isAuthEndpoint = endpoint.includes('/api/admin/auth/');
    
    if (res.status === 401 && !options._retry && !isAuthEndpoint) {
      try {
        await refreshAccessToken();
        return request(endpoint, { ...options, _retry: true });
      } catch (_refreshError) {
        if (isAccessTokenExpired()) {
          notifySessionExpired();
        }
      }
    }
    
    // For 401 on login/auth, or if refresh failed, we just throw the error
    // so the caller (like AuthContext) can handle it.
    if (isGet && res.status !== 401) {
      const persisted = readPersistCache(cacheKey);
      if (persisted) return persisted;
    }
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  if (isGet) {
    requestCache.set(cacheKey, { time: Date.now(), data });
    const imageUrls = Array.from(collectImageUrls(data)).slice(0, 8);
    if (imageUrls.length > 0) {
      Promise.allSettled(imageUrls.map((url) => cacheImageUrl(url))).then(() => {
        writePersistCache(cacheKey, withCachedImages(data));
      });
    } else {
      writePersistCache(cacheKey, data);
    }
  }

  return data;
}

async function requestBlob(endpoint, options = {}) {
  const token = TokenService.getAccessToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: options.credentials ?? fetchCredentials(),
  });

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
      body: {
        phoneNumber: String(phone ?? '').trim(),
        password,
        ...(username ? { username } : {}),
      },
    }),

  verifyOTP: (phone, otp, challengeToken) =>
    request('/api/admin/auth/verify-otp', {
      method: 'POST',
      body: {
        phoneNumber: String(phone ?? '').trim(),
        code: String(otp ?? '').trim(),
        challengeToken: String(challengeToken ?? '').trim(),
      },
    }),

  logout: () =>
    request('/api/admin/auth/logout', { method: 'POST' }),

  refresh: () => refreshAccessToken(),
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
  getLowRemainingMeals: (params = {}) => {
    const q = new URLSearchParams();
    if (params.maxRemaining != null) q.set('maxRemaining', String(params.maxRemaining));
    if (params.entityType) q.set('entityType', String(params.entityType));
    const qs = q.toString();
    return request(`/api/admin/subscriptions/analytics/low-remaining-meals${qs ? `?${qs}` : ''}`);
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
  // sourceDate identifies the existing row to update; formData.menu_date can move it to a new date.
  update: (sourceDate, formData) =>
    request(`/api/admin/menu/${sourceDate}`, { method: 'PUT', body: formData }),
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
  getReduceScopeOptions: (params = {}) => {
    const q = new URLSearchParams();
    if (params.date) q.set('date', String(params.date));
    const qs = q.toString();
    return request(`/api/admin/meals/reduce-scope-options${qs ? `?${qs}` : ''}`);
  },
  reduceScoped: (body) => request('/api/admin/meals/reduce-scoped', { method: 'POST', body }),
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

export const adminMealSizeUpgradeAPI = {
  getAll: () => request('/api/admin/meal-size-upgrade-prices'),
  getHistory: (limit = 50) => request(`/api/admin/meal-size-upgrade-prices/history?limit=${limit}`),
  upsert: (body) => request('/api/admin/meal-size-upgrade-prices', { method: 'POST', body }),
  delete: (id) => request(`/api/admin/meal-size-upgrade-prices/${id}`, { method: 'DELETE' }),
};

// ─── Admin Corporate Locations APIs ──────────────────────────────────────────
// GET  /api/admin/corporate-locations              Get all corporate locations
// POST /api/admin/corporate-locations              Body: { name*, address*, city*, state*, is_active }
// PUT  /api/admin/corporate-locations/{id}         Body: { name?, address?, city?, state?, is_active? }
// DELETE /api/admin/corporate-locations/{id}       Delete a location
export const adminCorporateAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === null) return;
      q.set(k, String(v));
    });
    const qs = q.toString();
    return request(`/api/admin/corporate-locations${qs ? `?${qs}` : ''}`);
  },
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
  getOpenCarts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/payment/open-carts${q ? `?${q}` : ''}`);
  },
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

// ─── Admin Bulk Orders APIs ───────────────────────────────────────────────────
export const adminBulkOrdersAPI = {
  getConfig: () => request('/api/admin/bulk-orders/config'),
  updateConfig: (data) => request('/api/admin/bulk-orders/config', { method: 'PUT', body: data }),
  listVarietyCategories: () => request('/api/admin/bulk-orders/variety-categories'),
  createVarietyCategory: (formData) =>
    request('/api/admin/bulk-orders/variety-categories', { method: 'POST', body: formData }),
  updateVarietyCategory: (id, formData) =>
    request(`/api/admin/bulk-orders/variety-categories/${id}`, { method: 'PUT', body: formData }),
  deleteVarietyCategory: (id) =>
    request(`/api/admin/bulk-orders/variety-categories/${id}`, { method: 'DELETE' }),
  listVarietyMeals: () => request('/api/admin/bulk-orders/variety-meals'),
  createVarietyMeal: (formData) =>
    request('/api/admin/bulk-orders/variety-meals', { method: 'POST', body: formData }),
  updateVarietyMeal: (id, formData) =>
    request(`/api/admin/bulk-orders/variety-meals/${id}`, { method: 'PUT', body: formData }),
  deleteVarietyMeal: (id) =>
    request(`/api/admin/bulk-orders/variety-meals/${id}`, { method: 'DELETE' }),
  listOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/bulk-orders/orders${q ? `?${q}` : ''}`);
  },
  getOrder: (id) => request(`/api/admin/bulk-orders/orders/${id}`),
};

/** Registered app user (signup username) — for bulk order customer display */
export const adminClientsAPI = {
  getById: (clientId) => request(`/api/admin/clients/${encodeURIComponent(clientId)}`),
};

// ─── Common APIs ──────────────────────────────────────────────────────────────
// GET /api/admin/subscription-plan-days   (admin token; common client-only paths return 403 for admin)
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
  getSubscriptions: () => request('/api/admin/subscription-plan-days'),
  getSubscriptionById: (id) => request(`/api/admin/subscription-plan-days/${id}`),
  getMenuHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/common/menu/history/all${q ? `?${q}` : ''}`);
  },
  getMenuByDate: (date) => request(`/api/common/menu/${date}`),
};

export { TokenService };
export default request;
