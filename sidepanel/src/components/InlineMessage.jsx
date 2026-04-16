function InlineMessage({ message, onClose }) {
  if (!message) return null;

  const className = `inline-message inline-message-${message.type || 'info'}`;

  return (
    <div className={className} role="status">
      <span className="inline-message-text">{message.text}</span>
      <button type="button" className="inline-message-close" onClick={onClose} aria-label="关闭提示">
        ×
      </button>
    </div>
  );
}

export default InlineMessage;
