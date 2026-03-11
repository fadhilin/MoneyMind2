import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'finance-control-saldo-visibility';
const EVENT_NAME = 'saldo-visibility-change';

// Global variable to keep components synchronized
let globalIsVisible = true;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) {
    globalIsVisible = JSON.parse(saved);
  }
} catch {
  globalIsVisible = true;
}

export function useVisibilityStore() {
  const [isSaldoVisible, setIsSaldoVisible] = useState(globalIsVisible);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        try {
          const val = JSON.parse(e.newValue);
          globalIsVisible = val;
          setIsSaldoVisible(val);
        } catch {
          // ignore parsing error
        }
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const val = customEvent.detail;
      globalIsVisible = val;
      setIsSaldoVisible(val);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(EVENT_NAME, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
    };
  }, []);

  const toggleVisibility = useCallback(() => {
    const nextValue = !globalIsVisible;
    globalIsVisible = nextValue;
    setIsSaldoVisible(nextValue);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: nextValue }));
  }, []);

  return { isSaldoVisible, toggleVisibility };
}
