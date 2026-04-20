import { useId } from 'react';
import { useDialogA11y } from '../hooks/useDialogA11y.js';

function ActionDialog({ actionDialog, actionDialogValues, dialogSubmitting, onClose, onSubmit, onFieldChange }) {
  const isOpen = Boolean(actionDialog?.open);
  const dialogFields = Array.isArray(actionDialog?.fields) ? actionDialog.fields : [];
  const titleId = useId();
  const descriptionId = useId();
  const { panelRef, initialFocusRef } = useDialogA11y({
    open: isOpen,
    onClose,
    dismissDisabled: dialogSubmitting
  });

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onClick={() => !dialogSubmitting && onClose()}>
      <section
        ref={panelRef}
        className="overlay-panel action-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={actionDialog.message ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overlay-header">
          <h2 id={titleId} className="overlay-title">
            {actionDialog.title || '操作确认'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} disabled={dialogSubmitting} aria-label="关闭弹窗">
            ×
          </button>
        </div>

        {actionDialog.message ? (
          <p id={descriptionId} className="overlay-subtitle">
            {actionDialog.message}
          </p>
        ) : null}

        {dialogFields.length > 0 ? (
          <div className="field-stack">
            {dialogFields.map((field, index) => (
              <label key={field.key} className="field-stack">
                <span className="field-label">{field.label || field.key}</span>
                <input
                  ref={index === 0 ? initialFocusRef : undefined}
                  className="field-input"
                  type={field.type === 'password' ? 'password' : 'text'}
                  autoComplete={field.type === 'password' ? 'current-password' : 'off'}
                  placeholder={field.placeholder || ''}
                  value={String(actionDialogValues[field.key] || '')}
                  onChange={(event) => onFieldChange(field.key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !dialogSubmitting) {
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
          <button
            ref={dialogFields.length === 0 ? initialFocusRef : undefined}
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={dialogSubmitting}
          >
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
