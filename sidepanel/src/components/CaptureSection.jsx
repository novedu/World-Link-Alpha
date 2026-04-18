import { CAPTURE_STATUS } from '../constants/worldLink';
import { getCaptureStatus } from '../utils/captureUtils';
import EmptyStateCard from './EmptyStateCard';

function truncateText(text, maxLength = 54) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function getCaptureStatusLabel(status) {
  if (status === CAPTURE_STATUS.ORGANIZED) return '已整理';
  if (status === CAPTURE_STATUS.CONVERTED) return '已转设定';
  return '未整理';
}

function getCaptureStatusClassName(status) {
  if (status === CAPTURE_STATUS.ORGANIZED) return 'capture-status-badge capture-status-organized';
  if (status === CAPTURE_STATUS.CONVERTED) return 'capture-status-badge capture-status-converted';
  return 'capture-status-badge capture-status-inbox';
}

function getUsageLevel(count) {
  if (count >= 10) return { label: '高频', className: 'capture-badge capture-badge-hot' };
  if (count >= 5) return { label: '常用', className: 'capture-badge capture-badge-warm' };
  if (count >= 3) return { label: '多次', className: 'capture-badge capture-badge-mid' };
  return { label: `x${count}`, className: 'capture-badge capture-badge-cold' };
}

function CaptureSection({
  capturedList,
  highlightedCaptureId,
  captureStatusFilter,
  captureSourceFilter,
  captureTimeFilter,
  captureStatusOptions,
  captureTimeOptions,
  captureSourceOptions,
  onCaptureStatusFilterChange,
  onCaptureSourceFilterChange,
  onCaptureTimeFilterChange,
  onClearCaptureFilters,
  onMarkCaptureStatus,
  onCreateFromCapture,
  onGoToEntityTab,
  totalCaptureCount
}) {
  const hasActiveFilters =
    captureStatusFilter !== 'all' || captureSourceFilter !== 'all' || captureTimeFilter !== 'all';

  return (
    <div className="section-body">
      <div className="toolbar-wrap">
        <select
          className="field-input toolbar-select"
          value={captureStatusFilter}
          onChange={(event) => onCaptureStatusFilterChange(event.target.value)}
        >
          {captureStatusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          className="field-input toolbar-select"
          value={captureSourceFilter}
          onChange={(event) => onCaptureSourceFilterChange(event.target.value)}
        >
          <option value="all">全部来源</option>
          {captureSourceOptions.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <select
          className="field-input toolbar-select"
          value={captureTimeFilter}
          onChange={(event) => onCaptureTimeFilterChange(event.target.value)}
        >
          {captureTimeOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button type="button" className="btn-secondary" onClick={onClearCaptureFilters}>
            清空筛选
          </button>
        ) : null}
      </div>

      <div className="capture-list">
        {capturedList.length > 0 ? (
          capturedList.map((item) => {
            const usage = getUsageLevel(Number(item.count || 1));
            const status = getCaptureStatus(item);
            return (
              <div
                key={item.timestamp + item.text}
                className={`capture-card ${
                  highlightedCaptureId === item.text || highlightedCaptureId === '__refresh_all__'
                    ? 'capture-card-active'
                    : ''
                }`}
              >
                <div className="capture-card-inner">
                  <div className="capture-card-content">
                    <div className="capture-card-title-row">
                      <p className="capture-card-text">{truncateText(item.text, 72)}</p>
                      <span className={getCaptureStatusClassName(status)}>{getCaptureStatusLabel(status)}</span>
                      {item.count > 1 ? <span className={usage.className}>{usage.label}</span> : null}
                      {item.isPinned ? <span className="capture-badge capture-badge-pin">置顶</span> : null}
                    </div>

                    {item.sourceUrl ? (
                      <div className="capture-card-source">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="capture-card-link"
                          title={item.sourceTitle || item.sourceUrl}
                        >
                          {item.sourceTitle || getDomain(item.sourceUrl)}
                        </a>
                      </div>
                    ) : null}

                    <div className="capture-card-footer">
                      <p className="capture-time-label">
                        {formatTimestamp(item.timestamp)}
                      </p>
                      <div className="capture-card-actions">
                        <button
                          type="button"
                          className="btn-secondary btn-mini"
                          disabled={status === CAPTURE_STATUS.INBOX}
                          onClick={() => onMarkCaptureStatus(item, CAPTURE_STATUS.INBOX)}
                        >
                          标记未整理
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-mini"
                          disabled={status === CAPTURE_STATUS.ORGANIZED}
                          onClick={() => onMarkCaptureStatus(item, CAPTURE_STATUS.ORGANIZED)}
                        >
                          标记已整理
                        </button>
                        <button type="button" onClick={() => onCreateFromCapture(item)} className="btn-primary btn-mini">
                          转成设定
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyStateCard
            icon={hasActiveFilters && totalCaptureCount > 0 ? '筛' : '灵'}
            title={hasActiveFilters && totalCaptureCount > 0 ? '筛选后暂无结果' : '还没有灵感记录'}
            description={
              hasActiveFilters && totalCaptureCount > 0
                ? '当前筛选条件下没有灵感记录，试试清空筛选。'
                : '在网页选中文字后，右键点击“存入 World-Link”即可开始收集灵感。'
            }
            actions={
              hasActiveFilters && totalCaptureCount > 0
                ? [{ label: '清空筛选', onClick: onClearCaptureFilters }]
                : [{ label: '去设定库手动新建', onClick: onGoToEntityTab }]
            }
          />
        )}
      </div>

      {capturedList.length > 0 ? <p className="helper-text text-center">共收集 {capturedList.length} 条灵感</p> : null}
    </div>
  );
}

export default CaptureSection;
