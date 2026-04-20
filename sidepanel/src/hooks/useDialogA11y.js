import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    return element.getClientRects().length > 0;
  });
}

export function useDialogA11y({ open, onClose, dismissDisabled = false }) {
  const panelRef = useRef(null);
  const initialFocusRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusFrame = window.requestAnimationFrame(() => {
      const focusTarget =
        initialFocusRef.current ||
        getFocusableElements(panelRef.current)[0] ||
        panelRef.current;

      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus();
      }
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [open]);

  useEffect(() => {
    if (open) return undefined;

    const previousActiveElement = previousActiveElementRef.current;
    if (!previousActiveElement || !document.contains(previousActiveElement)) {
      return undefined;
    }

    const restoreFrame = window.requestAnimationFrame(() => {
      previousActiveElement.focus();
    });

    return () => window.cancelAnimationFrame(restoreFrame);
  }, [open]);

  useEffect(() => {
    if (!open || !(panelRef.current instanceof HTMLElement)) {
      return undefined;
    }

    const panelElement = panelRef.current;

    // Keep keyboard navigation inside the active dialog so layered modals stay predictable.
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!dismissDisabled) {
          event.preventDefault();
          onClose?.();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(panelElement);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelElement.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || activeElement === panelElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    panelElement.addEventListener('keydown', handleKeyDown);

    return () => {
      panelElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissDisabled, onClose, open]);

  return {
    panelRef,
    initialFocusRef
  };
}

export default useDialogA11y;
