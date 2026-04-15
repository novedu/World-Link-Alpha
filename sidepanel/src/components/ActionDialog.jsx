function ActionDialog({ actionDialog, actionDialogValues, dialogSubmitting, onClose, onSubmit, onFieldChange }) {
  if (!actionDialog?.open) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onClick={() => !dialogSubmitting && onClose()}>
      <section
        className="overlay-panel action-panel"
        role="dialog"
        aria-modal="true"
        aria-label={actionDialog.title || '操作确认'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overlay-header">
          <h2 className="overlay-title">{actionDialog.title || '操作确认'}</h2>
          <button type="button" className="btn-icon" onClick={onClose} disabled={dialogSubmitting} aria-label="关闭弹窗">
            ×
          </button>
        </div>

        {actionDialog.message ? <p className="overlay-subtitle">{actionDialog.message}</p> : null}

        {actionDialog.fields.length > 0 ? (
          <div className="field-stack">
            {actionDialog.fields.map((field) => (
              <label key={field.key} className="field-stack">
                <span className="field-label">{field.label || field.key}</span>
                <input
                  className="field-input"
                  type={field.type === 'password' ? 'password' : 'text'}
                  autoComplete={field.type === 'password' ? 'current-password' : 'off'}
                  placeholder={field.placeholder || ''}
                  value={String(actionDialogValues[field.key] || '')}
                  onChange={(event) => onFieldChange(field.key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void onSubmit();
                    }
                  }}
                  disabled={dialogSubmitting}
                />
              </label>
            ))}
          </div>
        ) : null}

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={dialogSubmitting}>
            {actionDialog.cancelText || '取消'}
          </button>
          <button type="button" className="btn-primary" onClick={onSubmit} disabled={dialogSubmitting}>
            {dialogSubmitting ? '处理中...' : actionDialog.confirmText || '确定'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ActionDialog;
