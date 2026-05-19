export const ORDER_STATUS_COLORS = {
  completed: 'success',
  confirmed: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'secondary',
};

export const formatOrderStatus = (status) => {
  const s = String(status ?? '').trim().toLowerCase();
  if (s === 'confirmed') return 'completed';
  return s || '—';
};

/** Standard bulk (< tier threshold) vs large event (50+). */
export const formatBulkTierMode = (tierMode) => {
  const m = String(tierMode ?? '').trim().toLowerCase();
  if (m === 'under_threshold') {
    return { label: 'Standard bulk', short: 'Standard', variant: 'info' };
  }
  if (m === 'at_or_above_threshold') {
    return { label: 'Large event bulk', short: '50+', variant: 'accent' };
  }
  return { label: tierMode || '—', short: tierMode || '—', variant: 'secondary' };
};

export const formatInr = (amount) =>
  `₹${Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const formatBulkDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatBulkDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatBulkDeliveryAddress = (order) => {
  const line = String(order.address_line ?? order.addressLine ?? '').trim();
  const city = String(order.city_name ?? order.cityName ?? '').trim();
  const state = String(order.state_name ?? order.stateName ?? '').trim();
  const pin = String(order.pincode ?? '').trim();
  const parts = [line, city, state, pin].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
};

export const parseOrderItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const defaultBulkConfig = {
  min_quantity: '10',
  standard_max_quantity: '49',
  min_lead_days: '3',
  tier_threshold: '50',
  price_per_meal_under_threshold: '0',
  variety_menu_lookahead_days: '14',
  max_variety_types: '5',
  allow_multiple_variety_meals: true,
  min_quantity_per_variety_meal: '1',
  is_active: true,
  hub_intro_text: '',
  standard_tier_title: '',
  standard_tier_subtitle: '',
  standard_tier_description: '',
  variety_tier_title: '',
  variety_tier_subtitle: '',
  variety_tier_description: '',
};

export function configFromApi(cfg) {
  return {
    min_quantity: String(cfg.min_quantity ?? 10),
    standard_max_quantity: String(
      cfg.standard_max_quantity ?? Math.max(Number(cfg.min_quantity ?? 10), Number(cfg.tier_threshold ?? 50) - 1)
    ),
    min_lead_days: String(cfg.min_lead_days ?? 3),
    tier_threshold: String(cfg.tier_threshold ?? 50),
    price_per_meal_under_threshold: String(cfg.price_per_meal_under_threshold ?? 0),
    variety_menu_lookahead_days: String(cfg.variety_menu_lookahead_days ?? 14),
    max_variety_types: String(cfg.max_variety_types ?? 5),
    allow_multiple_variety_meals: cfg.allow_multiple_variety_meals !== false,
    min_quantity_per_variety_meal: String(cfg.min_quantity_per_variety_meal ?? 1),
    is_active: cfg.is_active !== false,
    hub_intro_text: cfg.hub_intro_text ?? '',
    standard_tier_title: cfg.standard_tier_title ?? '',
    standard_tier_subtitle: cfg.standard_tier_subtitle ?? '',
    standard_tier_description: cfg.standard_tier_description ?? '',
    variety_tier_title: cfg.variety_tier_title ?? '',
    variety_tier_subtitle: cfg.variety_tier_subtitle ?? '',
    variety_tier_description: cfg.variety_tier_description ?? '',
  };
}
