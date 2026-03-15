import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const EVENT_NAME = 'FINANCE_GLOBAL_DATE_CHANGE';

export const setGlobalDate = async (date: string) => {
  await Preferences.set({ key: 'globalDate', value: date });
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const useGlobalDate = (): [string, (date: string) => void] => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  useEffect(() => {
    const loadDate = async () => {
      const { value: stored } = await Preferences.get({ key: 'globalDate' });
      if (stored) {
        setDate(stored);
      }
    };
    loadDate();

    const handleStorageChange = async () => {
      const { value: stored } = await Preferences.get({ key: 'globalDate' });
      if (stored) {
        setDate(stored);
      }
    };
    window.addEventListener(EVENT_NAME, handleStorageChange);
    return () => window.removeEventListener(EVENT_NAME, handleStorageChange);
  }, []);
  
  return [date, (d) => { setGlobalDate(d); }];
};
