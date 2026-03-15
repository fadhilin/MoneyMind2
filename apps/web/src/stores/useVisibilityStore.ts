import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'finance-control-saldo-visibility';
const EVENT_NAME = 'saldo-visibility-change';

export function useVisibilityStore() {
  const [isSaldoVisible, setIsSaldoVisible] = useState(true);

  useEffect(() => {
    const loadVisibility = async () => {
      const { value: saved } = await Preferences.get({ key: STORAGE_KEY });
      if (saved !== null) {
        setIsSaldoVisible(JSON.parse(saved));
      }
    };
    loadVisibility();

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const val = customEvent.detail;
      setIsSaldoVisible(val);
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
    };
  }, []);

  const toggleVisibility = useCallback(async () => {
    const nextValue = !isSaldoVisible;
    setIsSaldoVisible(nextValue);
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(nextValue)
    });
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: nextValue }));
  }, [isSaldoVisible]);

  return { isSaldoVisible, toggleVisibility };
}
