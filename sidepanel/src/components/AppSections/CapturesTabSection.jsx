import CaptureSection from '../CaptureSection';

export function CapturesTabSection({
  capturesForView,
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
  capturedList
}) {
  return (
    <div className="section-card fade-in">
      <div className="card-header">
        <h2>灵感箱</h2>
        <div className="text-sm card-header-meta card-header-meta-muted">
          当前 {capturesForView.length} / 全部 {capturedList.length}
        </div>
      </div>
      <CaptureSection
        capturedList={capturesForView}
        highlightedCaptureId={highlightedCaptureId}
        captureStatusFilter={captureStatusFilter}
        captureSourceFilter={captureSourceFilter}
        captureTimeFilter={captureTimeFilter}
        captureStatusOptions={captureStatusOptions}
        captureTimeOptions={captureTimeOptions}
        captureSourceOptions={captureSourceOptions}
        onCaptureStatusFilterChange={onCaptureStatusFilterChange}
        onCaptureSourceFilterChange={onCaptureSourceFilterChange}
        onCaptureTimeFilterChange={onCaptureTimeFilterChange}
        onClearCaptureFilters={onClearCaptureFilters}
        onMarkCaptureStatus={onMarkCaptureStatus}
        onCreateFromCapture={onCreateFromCapture}
        onGoToEntityTab={onGoToEntityTab}
        totalCaptureCount={capturedList.length}
      />
    </div>
  );
}
