function InlineMessage({ message, onClose }) {
  if (!message) return null;

  const className = `inline-message inline-message-${message.type || 'info'}`;
  const hasActions = Array.isArray(message.actions) && message.actions.length > 0;
  const hasTitle = Boolean(message.title);

  return (
    <div className={className} role={message.type === 'error' ? 'alert' : 'status'}>
      <div className="inline-message-body">
        {hasTitle ? <p className="inline-message-title">{message.title}</p> : null}
        <span className="inline-message-text">{message.text}</span>
        {hasActions ? (
          <div className="inline-message-actions">
            {message.actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className={action.variant === 'primary' ? 'btn-primary btn-mini' : 'btn-secondary btn-mini'}
                onClick={action.onClick}
                disabled={Boolean(action.disabled)}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {onClose ? (
        <button type="button" className="inline-message-close" onClick={onClose} aria-label="关闭提示">
          ×
        </button>
      ) : null}
    </div>
  );
}

export default InlineMessage;
