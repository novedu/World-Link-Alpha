function ActivationChecklistCard({ checklist, onDismiss, onStartTour }) {
  if (!checklist?.visible) return null;

  const {
    completedCount = 0,
    totalCount = 0,
    progressPercent = 0,
    steps = []
  } = checklist;

  return (
    <section className="section-card activation-card">
      <div className="card-header">
        <h2>新手激活任务</h2>
        <div className="text-sm card-header-meta card-header-meta-muted">
          已完成 {completedCount}/{totalCount}
        </div>
      </div>
      <div className="activation-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
        <div className="activation-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="activation-step-list">
        {steps.map((step, index) => (
          <div key={step.id || index} className={`activation-step-item ${step.done ? 'activation-step-done' : ''}`}>
            <div className="activation-step-main">
              <div className="activation-step-title-row">
                <span className="activation-step-index" aria-hidden="true">
                  {step.done ? '✓' : index + 1}
                </span>
                <p className="activation-step-title">{step.title}</p>
              </div>
              <p className="activation-step-desc">{step.description}</p>
            </div>
            {!step.done && typeof step.onAction === 'function' ? (
              <button
                type="button"
                className="btn-inline btn-inline-secondary activation-step-action"
                onClick={step.onAction}
              >
                {step.actionLabel || '去完成'}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {onDismiss || onStartTour ? (
        <div className="activation-card-actions">
          {onStartTour ? (
            <button type="button" className="btn-primary btn-mini" onClick={onStartTour}>
              开始分步引导
            </button>
          ) : null}
          <button type="button" className="btn-secondary btn-mini" onClick={onDismiss}>
            稍后再看
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default ActivationChecklistCard;
