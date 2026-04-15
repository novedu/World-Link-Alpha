import { useMemo } from 'react';

export function useCaptureFilters({
  capturedList,
  captureStatusFilter,
  captureSourceFilter,
  captureTimeFilter,
  getCaptureDomain,
  getCaptureStatus,
  matchCaptureTime
}) {
  const captureSourceOptions = useMemo(
    () => [...new Set(capturedList.map((item) => getCaptureDomain(item)))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    [capturedList, getCaptureDomain]
  );

  const capturesForView = useMemo(() => {
    let list = [...capturedList];

    if (captureStatusFilter !== 'all') {
      list = list.filter((item) => getCaptureStatus(item) === captureStatusFilter);
    }

    if (captureSourceFilter !== 'all') {
      list = list.filter((item) => getCaptureDomain(item) === captureSourceFilter);
    }

    if (captureTimeFilter !== 'all') {
      list = list.filter((item) => matchCaptureTime(item, captureTimeFilter));
    }

    list.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    return list;
  }, [
    capturedList,
    captureStatusFilter,
    captureSourceFilter,
    captureTimeFilter,
    getCaptureStatus,
    getCaptureDomain,
    matchCaptureTime
  ]);

  const recentCaptures = useMemo(
    () =>
      [...capturedList]
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .slice(0, 6),
    [capturedList]
  );

  return {
    captureSourceOptions,
    capturesForView,
    recentCaptures
  };
}
