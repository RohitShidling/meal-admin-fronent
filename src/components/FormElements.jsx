import './FormElements.css';

export function FormGroup({ label, error, required, children, hint }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function Input({ id, label, error, required, hint, className = '', ...props }) {
  return (
    <FormGroup label={label} error={error} required={required} hint={hint}>
      <input
        id={id}
        className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
        {...props}
      />
    </FormGroup>
  );
}

export function Textarea({ id, label, error, required, hint, className = '', rows = 3, ...props }) {
  return (
    <FormGroup label={label} error={error} required={required} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        className={`form-input form-textarea ${error ? 'form-input-error' : ''} ${className}`}
        {...props}
      />
    </FormGroup>
  );
}

export function Select({ id, label, error, required, hint, children, className = '', ...props }) {
  return (
    <FormGroup label={label} error={error} required={required} hint={hint}>
      <select
        id={id}
        className={`form-input form-select ${error ? 'form-input-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FormGroup>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : icon ? (
        <span className="btn-icon">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

export function Badge({ children, variant = 'default' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function Spinner({ size = 'md' }) {
  return <div className={`spinner spinner-${size}`} />;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-desc">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, loading, confirmLabel = 'Delete', confirmVariant = 'danger' }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{message}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
