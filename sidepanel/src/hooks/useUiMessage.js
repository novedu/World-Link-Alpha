import { useEffect, useState } from 'react';

export function useUiMessage() {
  const [uiMessage, setUiMessage] = useState(null);

  const showUiMessage = (input, type = 'info') => {
    if (!input) return;

    if (typeof input === 'object' && !Array.isArray(input)) {
      if (!input.text) return;
      setUiMessage({
        ...input,
        type: input.type || type,
        at: Date.now()
      });
      return;
    }

    setUiMessage({
      type,
      text: String(input),
      at: Date.now()
    });
  };

  const clearUiMessage = () => {
    setUiMessage(null);
  };

  useEffect(() => {
    if (!uiMessage) return undefined;
    const timer = window.setTimeout(() => {
      setUiMessage(null);
    }, Number(uiMessage.durationMs || 3200));
    return () => window.clearTimeout(timer);
  }, [uiMessage]);

  return {
    uiMessage,
    showUiMessage,
    clearUiMessage
  };
}
