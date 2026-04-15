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
  return (
    <div className="section-body">
      <div className="field-stack">
        <div className="field-header">
          <label className="field-label">世界</label>
          <button
            type="button"
            onClick={onAddWorld}
            className="btn-inline btn-inline-primary"
          >
            + 新世界
          </button>
        </div>
        <div className="field-controls">
          <select
            className="field-input flex-1 min-w-0"
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

      <div className="field-stack">
        <div className="field-header">
          <label className="field-label">书项目</label>
          <button
            type="button"
            onClick={onAddBook}
            className="btn-inline btn-inline-secondary"
            disabled={!selectedWorldId}
          >
            + 新书
          </button>
        </div>
        <div className="field-controls">
          <select
            className="field-input flex-1 min-w-0"
            value={selectedBookId}
            onChange={(e) => onSelectBook(e.target.value)}
            disabled={!selectedWorldId}
          >
            <option value="">全部书 / 未指定</option>
            {booksInWorld.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentWorld && (
        <p className="helper-text">
          当前世界：<span className="font-medium" style={{ color: 'var(--primary)' }}>{currentWorld.name}</span>
          {selectedBookId && ' · 仅显示本书已使用的实体'}
        </p>
      )}
    </div>
  );
}

export default WorldBookSection;
