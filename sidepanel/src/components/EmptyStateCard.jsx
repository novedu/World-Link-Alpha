import Icon from './Icon';

function EmptyStateCard({
  title,
  description,
  actions = [],
  icon = '·',
  iconTone = 'default',
  compact = false
}) {
  const toneClassName =
    iconTone === 'warning' ? 'empty-state-icon-warning' : iconTone === 'success' ? 'empty-state-icon-success' : 'empty-state-icon-default';

  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <span className={`empty-state-icon ${toneClassName}`} aria-hidden="true">
        <Icon name={icon} size={compact ? 14 : 16} />
      </span>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {actions.length > 0 ? (
        <div className="empty-state-actions">
          {actions.map((action, index) => (
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
  );
}

export default EmptyStateCard;
