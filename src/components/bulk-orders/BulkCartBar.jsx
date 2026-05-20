import { useBulkCart } from '../../context/BulkCartContext';

export default function BulkCartBar() {
  const { items, totalQuantity, clearCart } = useBulkCart();
  if (totalQuantity === 0) return null;

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        marginTop: 24,
        padding: '14px 18px',
        borderRadius: 16,
        background: 'var(--surface-card, #fff)',
        border: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Cart</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {items.length} meal type{items.length === 1 ? '' : 's'} Â· {totalQuantity} portions
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={clearCart}>
          Clear
        </button>
      </div>
      <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', fontSize: 13 }}>
        {items.map((i) => (
          <li key={`${i.mealId}-${i.categoryId}`} style={{ padding: '4px 0' }}>
            {i.name} Ã— {i.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}
