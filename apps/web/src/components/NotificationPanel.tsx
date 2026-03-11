import { useEffect, useRef, useState } from 'react';

import { useActiveNotifications, type Notification } from '../hooks/useActiveNotifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  danger: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/10',
    border: 'border-rose-500/20',
    iconColor: 'text-rose-500',
    titleColor: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    border: 'border-blue-500/20',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
};

function NotificationItem({ notif, onDismiss }: { notif: Notification; onDismiss: (id: string) => void }) {
  const cfg = typeConfig[notif.type];
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.touches[0].clientX - touchStartRef.current;
    if (diff < 0) {
      setSwipeOffset(diff); // Only swipe left
    }
  };
  const handleTouchEnd = () => {
    if (swipeOffset < -80) {
      // Swiped far enough
      onDismiss(notif.id);
    } else {
      setSwipeOffset(0);
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-xl transition-all duration-300 ${swipeOffset === 0 ? 'border '+cfg.border : 'border-transparent'}`}
      style={{ height: swipeOffset < -300 ? 0 : 'auto', opacity: swipeOffset < -80 ? 0 : 1 }}
    >
      {/* Background Delete Action Area */}
      <div className="absolute inset-y-0 right-0 w-full bg-rose-500/10 flex items-center justify-end px-6">
        <span className="material-symbols-outlined text-rose-500 text-2xl animate-pulse">delete</span>
      </div>

      {/* Swipeable Card */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex gap-3 p-4 bg-white dark:bg-[#151121] transition-transform ${swipeOffset === 0 ? 'duration-300' : 'duration-0'} cursor-grab active:cursor-grabbing border ${cfg.border} rounded-xl`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        <div className={`mt-0.5 ${cfg.iconColor} shrink-0`}>
          <span className="material-symbols-outlined text-xl">{notif.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${cfg.titleColor}`}>{notif.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
        </div>
        <div className={`size-2 rounded-full ${cfg.dot} animate-pulse shrink-0 mt-1.5`} />
      </div>
    </div>
  );
}

const NotificationPanel = ({ isOpen, onClose }: NotificationPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { activeNotifications, handleDismiss, handleDismissAll } = useActiveNotifications();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 sm:right-0 top-full mt-3 w-[calc(100vw-2rem)] sm:w-[380px] z-50 glass-card rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/20 overflow-hidden animate-in"
      style={{ animation: 'slideIn 0.2s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base">Notifikasi</h3>
          <p className="text-xs text-slate-500 mt-0.5">{activeNotifications.length} peringatan aktif</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            activeNotifications.some(n => n.type === 'danger')
              ? 'bg-rose-500/10 text-rose-500'
              : activeNotifications.some(n => n.type === 'warning')
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            <span className="size-1.5 rounded-full bg-current animate-pulse" />
            {activeNotifications.some(n => n.type === 'danger')
              ? 'Perhatian'
              : activeNotifications.some(n => n.type === 'warning')
              ? 'Waspada'
              : 'Aman'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismissAll(activeNotifications.map(n => n.id));
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-rose-500 transition-all"
            title="Bersihkan Semua"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-all"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="p-4 space-y-3 max-h-[420px] overflow-x-hidden overflow-y-auto w-full">
        {activeNotifications.length > 0 ? activeNotifications.map((notif) => (
          <NotificationItem key={notif.id} notif={notif} onDismiss={handleDismiss} />
        )) : (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
             <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
             <p className="text-sm">Tidak ada notifikasi baru</p>
          </div>
        )}
      </div>

      {/* Footer deleted */}
    </div>
  );
};

export default NotificationPanel;
