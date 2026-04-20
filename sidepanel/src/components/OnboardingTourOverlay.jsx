import { useEffect, useMemo, useState } from 'react';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveTargetElement(selector) {
  if (!selector || typeof document === 'undefined') return null;
  return document.querySelector(selector);
}

function resolveTargetRect(target) {
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

function isRectMostlyOutOfViewport(rect, viewportWidth, viewportHeight) {
  if (!rect) return false;
  const topLimit = 56;
  const bottomLimit = Math.max(72, viewportHeight - 56);
  const leftLimit = 6;
  const rightLimit = Math.max(6, viewportWidth - 6);
  return rect.top < topLimit || rect.bottom > bottomLimit || rect.left < leftLimit || rect.right > rightLimit;
}

function OnboardingTourOverlay({
  open,
  steps = [],
  currentStepIndex = 0,
  onClose,
  onNext,
  onPrev,
  onRunStepAction
}) {
  const [targetRect, setTargetRect] = useState(null);
  const total = steps.length;
  const safeIndex = clamp(currentStepIndex, 0, Math.max(0, total - 1));
  const step = steps[safeIndex] || null;

  useEffect(() => {
    if (!open || !step) return undefined;
    if (typeof window === 'undefined') return undefined;

    const updateRect = () => {
      const target = resolveTargetElement(step.targetSelector);
      setTargetRect(resolveTargetRect(target));
    };

    const target = resolveTargetElement(step.targetSelector);
    const viewportWidth = window.innerWidth || 360;
    const viewportHeight = window.innerHeight || 640;
    const initialRect = resolveTargetRect(target);
    if (target && initialRect && isRectMostlyOutOfViewport(initialRect, viewportWidth, viewportHeight)) {
      target.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth'
      });
    }

    updateRect();
    const delayedUpdateTimer = window.setTimeout(updateRect, 240);
    const timer = window.setInterval(updateRect, 260);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.clearTimeout(delayedUpdateTimer);
      window.clearInterval(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return undefined;
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext?.();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onNext, onPrev]);

  const position = useMemo(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth || 360 : 360;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight || 640 : 640;
    const popoverWidth = clamp(viewportWidth - 24, 260, 340);
    const popoverHeight = 248;
    const gap = 12;

    if (!targetRect) {
      return {
        hasTarget: false,
        placement: 'center',
        arrowLeft: popoverWidth / 2,
        maskSegments: [
          {
            id: 'full',
            left: 0,
            top: 0,
            width: viewportWidth,
            height: viewportHeight
          }
        ],
        highlight: null,
        popover: {
          width: popoverWidth,
          left: clamp((viewportWidth - popoverWidth) / 2, 12, viewportWidth - popoverWidth - 12),
          top: clamp((viewportHeight - popoverHeight) / 2, 12, viewportHeight - popoverHeight - 12)
        }
      };
    }

    const highlightPadding = 6;
    const highlightLeft = clamp(targetRect.left - highlightPadding, 4, viewportWidth - 4);
    const highlightTop = clamp(targetRect.top - highlightPadding, 4, viewportHeight - 4);
    const highlightWidth = clamp(targetRect.width + highlightPadding * 2, 36, viewportWidth - highlightLeft - 4);
    const highlightHeight = clamp(targetRect.height + highlightPadding * 2, 24, viewportHeight - highlightTop - 4);
    const highlightRight = clamp(highlightLeft + highlightWidth, 0, viewportWidth);
    const highlightBottom = clamp(highlightTop + highlightHeight, 0, viewportHeight);

    const preferredLeft = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    const left = clamp(preferredLeft, 12, viewportWidth - popoverWidth - 12);

    const fitBottom = targetRect.bottom + gap + popoverHeight <= viewportHeight - 10;
    const top = fitBottom
      ? clamp(targetRect.bottom + gap, 12, viewportHeight - popoverHeight - 12)
      : clamp(targetRect.top - gap - popoverHeight, 12, viewportHeight - popoverHeight - 12);
    const placement = fitBottom ? 'bottom' : 'top';
    const arrowLeft = clamp(targetRect.left + targetRect.width / 2 - left, 16, popoverWidth - 16);

    const maskSegments = [
      {
        id: 'top',
        left: 0,
        top: 0,
        width: viewportWidth,
        height: Math.max(0, highlightTop)
      },
      {
        id: 'left',
        left: 0,
        top: highlightTop,
        width: Math.max(0, highlightLeft),
        height: Math.max(0, highlightHeight)
      },
      {
        id: 'right',
        left: highlightRight,
        top: highlightTop,
        width: Math.max(0, viewportWidth - highlightRight),
        height: Math.max(0, highlightHeight)
      },
      {
        id: 'bottom',
        left: 0,
        top: highlightBottom,
        width: viewportWidth,
        height: Math.max(0, viewportHeight - highlightBottom)
      }
    ];

    return {
      hasTarget: true,
      placement,
      arrowLeft,
      maskSegments,
      highlight: {
        left: highlightLeft,
        top: highlightTop,
        width: highlightWidth,
        height: highlightHeight
      },
      popover: {
        width: popoverWidth,
        left,
        top
      }
    };
  }, [targetRect]);

  if (!open || !step) return null;

  const isLast = safeIndex >= total - 1;

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="新手引导">
      <div className="tour-mask-layer" aria-hidden="true">
        {position.maskSegments.map((segment) => (
          <div
            key={segment.id}
            className="tour-mask-segment"
            style={{
              left: segment.left,
              top: segment.top,
              width: segment.width,
              height: segment.height
            }}
          />
        ))}
      </div>
      {position.hasTarget && position.highlight ? (
        <div className="tour-highlight" style={position.highlight} aria-hidden="true" />
      ) : null}
      <div className={`tour-popover tour-popover-${position.placement}`} style={position.popover}>
        {position.hasTarget ? (
          <span
            className="tour-popover-arrow"
            style={{ left: position.arrowLeft }}
            aria-hidden="true"
          />
        ) : null}
        <div className="tour-popover-header">
          <p className="tour-step-indicator">
            第 {safeIndex + 1} 步 / 共 {total} 步
          </p>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="关闭引导">
            ×
          </button>
        </div>
        <h3 className="tour-step-title">{step.title}</h3>
        <p className="tour-step-desc">{step.description}</p>
        {step.actionLabel ? (
          <button
            type="button"
            className="btn-inline btn-inline-secondary tour-step-action"
            onClick={() => onRunStepAction?.(step)}
          >
            {step.actionLabel}
          </button>
        ) : null}
        <div className="tour-popover-actions">
          <button type="button" className="btn-secondary btn-mini" onClick={onPrev} disabled={safeIndex === 0}>
            上一步
          </button>
          <button type="button" className="btn-primary btn-mini" onClick={isLast ? onClose : onNext}>
            {isLast ? '完成引导' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTourOverlay;
