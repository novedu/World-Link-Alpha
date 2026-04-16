import { useEffect, useState } from 'react';

export function useUiMessage() {
  const [uiMessage, setUiMessage] = useState(null);

  const showUiMessage = (text, type = 'info') => {
    if (!text) return;
    setUiMessage({
      type,
      text,
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
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [uiMessage]);

  return {
    uiMessage,
    showUiMessage,
    clearUiMessage
  };
}
