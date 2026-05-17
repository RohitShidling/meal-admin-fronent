import { useState, useEffect, useCallback } from 'react';
import { adminBulkOrdersAPI } from '../../services/api';
import { Button, Spinner, Input } from '../../components/FormElements';
import { toast } from '../../components/Toast';
import { defaultBulkConfig, configFromApi } from './shared';

export default function BulkOrderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVariety, setSavingVariety] = useState(false);
  const [config, setConfig] = useState(defaultBulkConfig);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfgRes = await adminBulkOrdersAPI.getConfig();
      setConfig(configFromApi(cfgRes?.data || {}));
    } catch (err) {
      toast.error(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const f = (key) => ({
    value: config[key],
    onChange: (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setConfig((p) => ({ ...p, [key]: val }));
    },
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminBulkOrdersAPI.updateConfig({
        min_quantity: Number(config.min_quantity),
        standard_max_quantity: Number(config.standard_max_quantity),
        min_lead_days: Number(config.min_lead_days),
        tier_threshold: Number(config.tier_threshold),
        price_per_meal_under_threshold: Number(config.price_per_meal_under_threshold),
        variety_menu_lookahead_days: Number(config.variety_menu_lookahead_days),
        is_active: config.is_active,
        hub_intro_text: config.hub_intro_text,
        standard_tier_title: config.standard_tier_title,
        standard_tier_subtitle: config.standard_tier_subtitle,
        standard_tier_description: config.standard_tier_description,
        variety_tier_title: config.variety_tier_title,
        variety_tier_subtitle: config.variety_tier_subtitle,
        variety_tier_description: config.variety_tier_description,
      });
      toast.success('Settings saved');
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVariety = async (e) => {
    e.preventDefault();
    setSavingVariety(true);
    try {
      await adminBulkOrdersAPI.updateConfig({
        max_variety_types: Number(config.max_variety_types),
        allow_multiple_variety_meals: config.allow_multiple_variety_meals,
      });
      toast.success('Variety rules saved');
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingVariety(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const threshold = Number(config.tier_threshold) || 50;

  return (
    <div>
      <form onSubmit={handleSave} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Standard tier (daily menu)</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Orders from min to max quantity use the daily menu for the delivery date.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          <Input label="Minimum meals" type="number" min="1" required {...f('min_quantity')} />
          <Input label="Maximum meals" type="number" min="1" required {...f('standard_max_quantity')} />
          <Input label="Lead time (days)" type="number" min="0" required {...f('min_lead_days')} />
          <Input label={`${threshold}+ threshold`} type="number" min="2" required {...f('tier_threshold')} />
          <Input
            label="Price per meal (standard tier)"
            type="number"
            min="0"
            step="0.01"
            required
            {...f('price_per_meal_under_threshold')}
          />
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input id="bulk-active" type="checkbox" checked={config.is_active} {...f('is_active')} />
          <label htmlFor="bulk-active">Bulk ordering enabled</label>
        </div>
        <div style={{ marginTop: 28 }}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>App hub</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Text shown on the bulk order screen in the mobile app. Each tier has its own card.
          </p>
          <Input label="Intro text (above both cards)" {...f('hub_intro_text')} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
            <div className="card" style={{ padding: 16, margin: 0 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>Standard bulk card</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
                Under {threshold} meals — daily school menu
              </p>
              <Input label="Title" {...f('standard_tier_title')} />
              <Input label="Subtitle" {...f('standard_tier_subtitle')} />
              <Input label="Description" {...f('standard_tier_description')} />
            </div>
            <div className="card" style={{ padding: 16, margin: 0 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>Large event bulk card</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
                {threshold}+ meals — variety categories
              </p>
              <Input label="Title" {...f('variety_tier_title')} />
              <Input label="Subtitle" {...f('variety_tier_subtitle')} />
              <Input label="Description" {...f('variety_tier_description')} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <Button type="submit" loading={saving}>
            Save settings
          </Button>
        </div>
      </form>

      <form onSubmit={handleSaveVariety} className="card" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Large event tier ({threshold}+ meals)</h3>
        <Input
          label="Max different meal types"
          type="number"
          min="2"
          max="20"
          disabled={!config.allow_multiple_variety_meals}
          {...f('max_variety_types')}
        />
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            id="bulk-allow-multiple"
            type="checkbox"
            checked={config.allow_multiple_variety_meals}
            {...f('allow_multiple_variety_meals')}
          />
          <label htmlFor="bulk-allow-multiple">Allow multiple different meals per order</label>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button type="submit" loading={savingVariety} size="sm">
            Save variety rules
          </Button>
        </div>
      </form>
    </div>
  );
}





