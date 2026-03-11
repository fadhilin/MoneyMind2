import { useState, useEffect } from 'react';

const EVENT_NAME = 'FINANCE_GLOBAL_DATE_CHANGE';

export const setGlobalDate = (date: string) => {
  localStorage.setItem('globalDate', date);
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const useGlobalDate = (): [string, (date: string) => void] => {
  const [date, setDate] = useState(() => {
    return localStorage.getItem('globalDate') || new Date().toISOString().split('T')[0];
  });
  
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('globalDate');
      if (stored) {
        setDate(stored);
      }
    };
    window.addEventListener(EVENT_NAME, handleStorageChange);
    return () => window.removeEventListener(EVENT_NAME, handleStorageChange);
  }, []);
  
  return [date, setGlobalDate];
};
