const TAB_ITEMS = [
  { id: 'entities', label: '设定库' },
  { id: 'captures', label: '灵感箱' },
  { id: 'overview', label: '总览' }
];

function PrimaryTabBar({ activeTab, onTabChange, captureCount }) {
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
          >
            <span>{item.label}</span>
            {item.id === 'captures' && captureCount > 0 ? (
              <span className="tab-badge">{captureCount}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export default PrimaryTabBar;
