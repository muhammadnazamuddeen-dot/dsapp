import { Icon } from './Icon';

export function PageLoading({ label = 'Loading…' }) {
  return (
    <div className="page-loading">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorPanel({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="panel error-panel">
      <div className="empty-icon">
        <Icon name="alert" />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, marginBottom: 6 }}>
        {title}
      </h2>
      <p>{message || 'Unable to load this page.'}</p>
      {onRetry && (
        <button className="btn btn-primary" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
