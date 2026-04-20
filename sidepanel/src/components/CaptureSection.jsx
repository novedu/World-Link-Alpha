import { useEffect, useMemo, useRef, useState } from 'react';
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

function ToolbarDropdown({
  value,
  options,
  open,
  onToggle,
  onClose,
  onChange,
  ariaLabel
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target)) return;
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const currentOption = options.find((item) => item.value === value) || options[0] || null;

  return (
    <div className="toolbar-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`field-input toolbar-dropdown-trigger ${open ? 'is-open' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="toolbar-dropdown-label">{currentOption?.label || '请选择'}</span>
        <span className={`toolbar-dropdown-caret ${open ? 'is-open' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="toolbar-dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((item) => {
            const selected = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                className={`toolbar-dropdown-option ${selected ? 'is-selected' : ''}`}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(item.value);
                  onClose();
                }}
              >
                <span className="toolbar-dropdown-option-label">{item.label}</span>
                {selected ? <span className="toolbar-dropdown-check">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  const [openFilterMenu, setOpenFilterMenu] = useState(null);

  const hasActiveFilters =
    captureStatusFilter !== 'all' || captureSourceFilter !== 'all' || captureTimeFilter !== 'all';
  const captureSourceOptionRows = useMemo(
    () => [
      { value: 'all', label: '全部来源' },
      ...captureSourceOptions.map((source) => ({
        value: source,
        label: source
      }))
    ],
    [captureSourceOptions]
  );

  return (
    <div className="section-body">
      <div className="toolbar-wrap">
        <ToolbarDropdown
          value={captureStatusFilter}
          options={captureStatusOptions}
          open={openFilterMenu === 'status'}
          onToggle={() => setOpenFilterMenu((prev) => (prev === 'status' ? null : 'status'))}
          onClose={() => setOpenFilterMenu(null)}
          onChange={onCaptureStatusFilterChange}
          ariaLabel="按状态筛选灵感"
        />

        <ToolbarDropdown
          value={captureSourceFilter}
          options={captureSourceOptionRows}
          open={openFilterMenu === 'source'}
          onToggle={() => setOpenFilterMenu((prev) => (prev === 'source' ? null : 'source'))}
          onClose={() => setOpenFilterMenu(null)}
          onChange={onCaptureSourceFilterChange}
          ariaLabel="按来源筛选灵感"
        />

        <ToolbarDropdown
          value={captureTimeFilter}
          options={captureTimeOptions}
          open={openFilterMenu === 'time'}
          onToggle={() => setOpenFilterMenu((prev) => (prev === 'time' ? null : 'time'))}
          onClose={() => setOpenFilterMenu(null)}
          onChange={onCaptureTimeFilterChange}
          ariaLabel="按时间筛选灵感"
        />

        {hasActiveFilters ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClearCaptureFilters();
              setOpenFilterMenu(null);
            }}
          >
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
                key={item.id || item.timestamp + item.text}
                className={`capture-card ${
                  highlightedCaptureId === item.id || highlightedCaptureId === '__refresh_all__'
                    ? 'capture-card-active'
                    : ''
                }`}
              >
                <div className="capture-card-inner">
                  <div className="capture-card-content">
                    <div className="capture-card-title-row">
                      <p className="capture-card-text">{truncateText(item.text, 72)}</p>
                    </div>

                    <div className="capture-card-badges">
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
                          onClick={() => onCreateFromCapture(item)}
                          className="btn-primary btn-mini capture-card-action-primary"
                        >
                          转成设定
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-mini capture-card-action-secondary"
                          disabled={status === CAPTURE_STATUS.INBOX}
                          onClick={() => onMarkCaptureStatus(item, CAPTURE_STATUS.INBOX)}
                        >
                          标记未整理
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-mini capture-card-action-secondary"
                          disabled={status === CAPTURE_STATUS.ORGANIZED}
                          onClick={() => onMarkCaptureStatus(item, CAPTURE_STATUS.ORGANIZED)}
                        >
                          标记已整理
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
            title={hasActiveFilters && totalCaptureCount > 0 ? '没有匹配灵感' : '还没有灵感'}
            description={
              hasActiveFilters && totalCaptureCount > 0
                ? '换个条件，或清空筛选。'
                : '网页划词后，右键存入即可。'
            }
            actions={
              hasActiveFilters && totalCaptureCount > 0
                ? [{ label: '清空筛选', onClick: onClearCaptureFilters }]
                : [{ label: '去设定库新建', onClick: onGoToEntityTab }]
            }
          />
        )}
      </div>

      {capturedList.length > 0 ? <p className="helper-text text-center">共 {capturedList.length} 条灵感</p> : null}
    </div>
  );
}

export default CaptureSection;
