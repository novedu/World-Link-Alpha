function WorldBookSection({
  worlds,
  booksInWorld,
  selectedWorldId,
  selectedBookId,
  currentWorld,
  onSelectWorld,
  onSelectBook,
  onAddWorld,
  onAddBook
}) {
  const currentScopeText = selectedBookId ? '当前只看这部作品的设定。' : '当前查看该世界的全部设定。';

  return (
    <div className="section-body">
      <div className="field-stack context-field-block" data-tour-id="world-selector">
        <div className="field-header context-field-header">
          <div className="context-label-stack">
            <label className="field-label">当前世界</label>
            <p className="context-field-note">先选世界，再选作品。</p>
          </div>
          <button
            type="button"
            onClick={onAddWorld}
            className="btn-inline btn-inline-primary context-action-btn"
            data-tour-id="add-world-btn"
          >
            + 新建世界
          </button>
        </div>
        <div className="field-controls">
          <select
            className="field-input flex-1 min-w-0 context-select"
            value={selectedWorldId}
            onChange={(e) => onSelectWorld(e.target.value)}
          >
            <option value="">选择世界...</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-stack context-field-block">
        <div className="field-header context-field-header">
          <div className="context-label-stack">
            <label className="field-label">当前作品</label>
            <p className="context-field-note">不指定时，会显示该世界的全部设定。</p>
          </div>
          <button
            type="button"
            onClick={onAddBook}
            className="btn-inline btn-inline-secondary context-action-btn"
            disabled={!selectedWorldId}
            data-tour-id="add-book-btn"
          >
            + 新建作品
          </button>
        </div>
        <div className="field-controls">
          <select
            className="field-input flex-1 min-w-0 context-select"
            value={selectedBookId}
            onChange={(e) => onSelectBook(e.target.value)}
            disabled={!selectedWorldId}
          >
            <option value="">全部作品</option>
            {booksInWorld.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentWorld && (
        <div className="context-scope-card" role="status">
          <p className="context-scope-label">当前生效</p>
          <p className="context-scope-value">
            <span className="helper-primary-text">{currentWorld.name}</span>
            <span className="context-scope-separator" aria-hidden="true">·</span>
            <span>{currentScopeText}</span>
          </p>
        </div>
      )}

      <div className="terms-hint terms-hint-grid">
        <p className="terms-hint-title">名词说明</p>
        <div className="terms-hint-items">
          <span className="terms-chip">
            <span className="terms-chip-label">设定</span>
            <span className="terms-chip-text">人物、地点、势力等信息</span>
          </span>
          <span className="terms-chip">
            <span className="terms-chip-label">灵感</span>
            <span className="terms-chip-text">划词保存的素材</span>
          </span>
          <span className="terms-chip">
            <span className="terms-chip-label">当前作品</span>
            <span className="terms-chip-text">当前正在写的目标作品</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default WorldBookSection;
