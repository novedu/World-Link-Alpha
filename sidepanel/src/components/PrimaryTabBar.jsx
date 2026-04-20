const TAB_ITEMS = [
  { id: 'entities', label: '设定库', iconClassName: 'tab-icon tab-icon-entities' },
  { id: 'captures', label: '灵感箱', iconClassName: 'tab-icon tab-icon-captures' },
  { id: 'timeline', label: '时间轴', iconClassName: 'tab-icon tab-icon-timeline' },
  { id: 'overview', label: '总览', iconClassName: 'tab-icon tab-icon-overview' }
];

function PrimaryTabBar({ activeTab, onTabChange, captureCount }) {
  const captureBadge = captureCount > 99 ? '99+' : captureCount;
  return (
    <nav className="tab-bar" aria-label="主导航">
      {TAB_ITEMS.map((item) => {
        const isActive = item.id === activeTab;
        return (
          <button
            key={item.id}
            type="button"
            className={`tab-button ${isActive ? 'tab-button-active' : ''}`}
            onClick={() => onTabChange(item.id)}
            aria-pressed={isActive}
            data-tour-id={`tab-${item.id}`}
          >
            <span className={item.iconClassName} aria-hidden="true" />
            <span className="tab-label">{item.label}</span>
            {item.id === 'captures' && captureCount > 0 ? (
              <span className="tab-badge">{captureBadge}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export default PrimaryTabBar;
