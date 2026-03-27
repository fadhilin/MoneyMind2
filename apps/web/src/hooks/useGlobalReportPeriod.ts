import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const EVENT_NAME = 'FINANCE_GLOBAL_REPORT_PERIOD_CHANGE';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export const setGlobalReportPeriod = async (period: ReportPeriod) => {
  await Preferences.set({ key: 'globalReportPeriod', value: period });
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const useGlobalReportPeriod = (): [ReportPeriod, (period: ReportPeriod) => void] => {
  const [period, setPeriod] = useState<ReportPeriod>(() => 'monthly');
  
  useEffect(() => {
    const loadPeriod = async () => {
      const { value: stored } = await Preferences.get({ key: 'globalReportPeriod' });
      if (stored && (stored === 'daily' || stored === 'weekly' || stored === 'monthly')) {
        setPeriod(stored as ReportPeriod);
      }
    };
    loadPeriod();

    const handleStorageChange = async () => {
      const { value: stored } = await Preferences.get({ key: 'globalReportPeriod' });
      if (stored && (stored === 'daily' || stored === 'weekly' || stored === 'monthly')) {
        setPeriod(stored as ReportPeriod);
      }
    };
    window.addEventListener(EVENT_NAME, handleStorageChange);
    return () => window.removeEventListener(EVENT_NAME, handleStorageChange);
  }, []);
  
  return [period, (p: ReportPeriod) => {
    setPeriod(p);
    setGlobalReportPeriod(p);
  }];
}
