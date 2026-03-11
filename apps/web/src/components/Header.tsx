import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import NotificationPanel from './NotificationPanel';
import { useActiveNotifications } from '../hooks/useActiveNotifications';
import { useGlobalDate } from '../hooks/useGlobalDate';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  darkMode: boolean;
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}

interface NotificationBellProps {
  showNotifs: boolean;
  setShowNotifs: React.Dispatch<React.SetStateAction<boolean>>;
  notificationsEnabled: boolean;
  notifCount: number;
  hasDanger: boolean;
}

const NotificationBell = ({ showNotifs, setShowNotifs, notificationsEnabled, notifCount, hasDanger }: NotificationBellProps) => (
  <div className="relative">
    <button
      onClick={() => setShowNotifs((v: boolean) => !v)}
      className={`size-10 flex items-center justify-center border rounded-xl relative transition-all shadow-sm ${
        showNotifs
          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
          : 'bg-white dark:bg-black border-slate-100 dark:border-white/10 text-black dark:text-white hover:border-primary/30 hover:text-primary'
      }`}
      title="Notifikasi"
    >
      <span className="material-symbols-outlined">
        {showNotifs ? 'notifications_active' : 'notifications'}
      </span>

      {/* Badge */}
      {notificationsEnabled && notifCount > 0 && (
        <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full border-2 border-white dark:border-black transition-all ${
          hasDanger ? 'bg-rose-500' : 'bg-amber-500'
        }`}>
          {notifCount > 9 ? '9+' : notifCount}
        </span>
      )}
    </button>

    {/* The panel */}
    <NotificationPanel isOpen={showNotifs} onClose={() => setShowNotifs(false)} />
  </div>
);

const Header = ({ darkMode, isSidebarOpen = false, onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const [globalDate, setGlobalDate] = useGlobalDate();
  const selectedDateObj = new Date(globalDate);
  const [showNotifs, setShowNotifs] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  
  // Pages where the calendar should NOT appear
  const hideDatePages = ['/transactions', '/savings'];
  const showCalendar = !hideDatePages.includes(location.pathname);
  
  // Pages where globalDate should be forced to today
  const isStaticDatePage = location.pathname === '/dashboard';
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    if (!isStaticDatePage) return;
    
    const localTodayStr = new Date().toLocaleDateString('en-CA');
    if (globalDate !== localTodayStr) {
      setGlobalDate(localTodayStr);
    }
    
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== today.getDate()) {
        setToday(now);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [isStaticDatePage, today, globalDate, setGlobalDate]);

  const handlePrevDay = () => {
    const newDate = new Date(globalDate);
    newDate.setDate(newDate.getDate() - 1);
    setGlobalDate(newDate.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const newDate = new Date(globalDate);
    newDate.setDate(newDate.getDate() + 1);
    setGlobalDate(newDate.toISOString().split('T')[0]);
  };

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Pengguna';
  const { activeNotifications, notificationsEnabled } = useActiveNotifications();
  const notifCount = activeNotifications.length;
  const hasDanger = activeNotifications.some(n => n.type === 'danger');

  return (
    <header className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 pt-[env(safe-area-inset-top)] transition-opacity duration-300 ${isSidebarOpen ? 'max-lg:opacity-0 max-lg:pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-black dark:text-white transition-colors  sm:max-w-none">
              👋 Halo, {displayName}
            </h2>
            <p className={`text-xs md:text-sm transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Kelola keuanganmu dengan lebih bijak hari ini.
            </p>
          </div>
        </div>

        {/* mobile bell */}
        <div className="md:hidden">
          <NotificationBell 
            showNotifs={showNotifs} 
            setShowNotifs={setShowNotifs} 
            notificationsEnabled={notificationsEnabled}
            notifCount={notifCount}
            hasDanger={hasDanger}
          />
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
        {showCalendar && (
          isStaticDatePage ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-black border border-slate-100 dark:border-white/10 rounded-xl shadow-sm transition-colors cursor-default select-none">
              <span className="material-symbols-outlined text-base text-primary">calendar_today</span>
              <span className="text-sm font-bold text-black dark:text-white">
                {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white dark:bg-black border border-slate-100 dark:border-white/10 rounded-xl px-1 border-b-2 border-b-primary shadow-sm transition-colors overflow-hidden relative">
              <button
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-primary transition-all z-10 bg-white dark:bg-black"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker();
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
                className="relative flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
              >
                <input 
                  ref={dateInputRef}
                  type="date"
                  value={globalDate}
                  onChange={({ target }) => {
                    if(target.value) setGlobalDate(target.value);
                  }}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                />
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-black dark:text-white transition-colors hover:text-primary z-10">
                  <span className="material-symbols-outlined text-base text-primary">calendar_today</span>
                  {selectedDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </button>

              <button
                onClick={handleNextDay}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-primary transition-all z-10 bg-white dark:bg-black"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          )
        )}

        {/* desktop bell */}
        <div className="hidden md:block relative">
          <NotificationBell 
            showNotifs={showNotifs} 
            setShowNotifs={setShowNotifs} 
            notificationsEnabled={notificationsEnabled}
            notifCount={notifCount}
            hasDanger={hasDanger}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
