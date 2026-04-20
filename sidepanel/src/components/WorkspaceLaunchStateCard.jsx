import EmptyStateCard from './EmptyStateCard';

function WorkspaceLaunchStateCard({ variant, onSignIn, onRegister, onRetry }) {
  const isGuest = variant === 'guest';
  const previewRows = [
    { label: '世界观库', value: '示例世界观' },
    { label: '当前作品', value: '示例作品' }
  ];
  const previewChips = ['角色', '地点', '片段'];

  const errorConfig = {
    sectionTitle: '暂时无法加载',
    meta: '工作区未连上',
    icon: 'alert',
    iconTone: 'warning',
    title: '工作区暂时没有连上',
    description: '请重新加载一次；如果仍然失败，再检查服务是否已经启动。',
    actions: [{ label: '重新加载', onClick: onRetry, variant: 'primary' }]
  };

  if (isGuest) {
    return (
      <section className="section-card launch-card launch-card-guest" aria-labelledby="guest-launch-title">
        <div className="launch-hero">
          <div className="launch-hero-top">
            <span className="launch-eyebrow">开始使用</span>
          </div>
          <div className="launch-hero-copy">
            <h2 id="guest-launch-title" className="launch-hero-title">登录后开始整理设定与灵感</h2>
            <p className="launch-hero-description">登录后，这里会变成你的整理工作区，世界观、作品和设定会保持同一上下文。</p>
          </div>
          <div className="launch-preview" aria-label="登录后工作区预览">
            <div className="launch-preview-head">
              <p className="launch-preview-title">登录后工作区预览</p>
              <span className="launch-preview-status">登录后同步</span>
            </div>
            <div className="launch-preview-rows">
              {previewRows.map((row) => (
                <div key={row.label} className="launch-preview-row">
                  <p className="launch-preview-label">{row.label}</p>
                  <p className="launch-preview-value">{row.value}</p>
                </div>
              ))}
              <div className="launch-preview-row">
                <p className="launch-preview-label">设定与灵感</p>
                <div className="launch-preview-chip-group" aria-hidden="true">
                  {previewChips.map((chip) => (
                    <span key={chip} className="launch-preview-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="launch-cta-group">
            <button type="button" className="btn-primary launch-cta-primary" onClick={onSignIn}>
              登录账号
            </button>
            <button type="button" className="btn-secondary launch-cta-secondary" onClick={onRegister}>
              注册账号
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-card launch-card launch-card-error">
      <div className="card-header">
        <h2>{errorConfig.sectionTitle}</h2>
        <div className="text-sm card-header-meta card-header-meta-muted">{errorConfig.meta}</div>
      </div>
      <EmptyStateCard
        icon={errorConfig.icon}
        iconTone={errorConfig.iconTone}
        title={errorConfig.title}
        description={errorConfig.description}
        actions={errorConfig.actions}
      />
    </section>
  );
}

export default WorkspaceLaunchStateCard;
