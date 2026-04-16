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
          <label className="field-label">世界观库</label>
          <button
            type="button"
            onClick={onAddWorld}
            className="btn-inline btn-inline-primary"
          >
            + 新建世界观
          </button>
        </div>
        <div className="field-controls">
          <select
            className="field-input flex-1 min-w-0"
            value={selectedWorldId}
            onChange={(e) => onSelectWorld(e.target.value)}
          >
            <option value="">选择世界观库...</option>
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
          <label className="field-label">当前作品</label>
          <button
            type="button"
            onClick={onAddBook}
            className="btn-inline btn-inline-secondary"
            disabled={!selectedWorldId}
          >
            + 新建作品
          </button>
        </div>
        <div className="field-controls">
          <select
            className="field-input flex-1 min-w-0"
            value={selectedBookId}
            onChange={(e) => onSelectBook(e.target.value)}
            disabled={!selectedWorldId}
          >
            <option value="">全部作品 / 未指定</option>
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
          当前世界观库：<span className="helper-primary-text">{currentWorld.name}</span>
          {selectedBookId && ' · 仅显示当前作品已使用的设定'}
        </p>
      )}

      <p className="terms-hint">
        术语说明：设定 = 人物/地点/势力等条目；灵感 = 网页划词收集；当前作品 = 你正在写的这本书。
      </p>
    </div>
  );
}

export default WorldBookSection;
