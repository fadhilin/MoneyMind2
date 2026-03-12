import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  darkMode: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenModal?: () => void;
}

const Sidebar = ({ darkMode, isOpen, onClose, onOpenModal }: SidebarProps) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Handle Swipe Gesture for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1024) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(null); // Reset when starting a new touch
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || window.innerWidth >= 1024) return;
    
    // Prevent background scrolling while swiping sidebar
    if (e.cancelable) {
      e.preventDefault();
    }
    
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    // Only allow closing when swiping to the left (negative distance)
    const swipeDistance = touchCurrentX - touchStartX;
    if (swipeDistance < -80) {
      onClose?.();
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  // Calculate live translation for smooth swiping
  // Math.min(0, ...) ensures we can't swipe to the right (it stays "stuck" at 0)
  const swipeTranslate = touchStartX !== null && touchCurrentX !== null 
    ? Math.min(0, touchCurrentX - touchStartX) 
    : 0;

  const navItems = [
    { name: 'Beranda', icon: 'house', path: '/dashboard' },
    { name: 'Transaksi', icon: 'assignment', path: '/transactions' },
    { name: 'Budget', icon: 'monetization_on', path: '/budget' },
    { name: 'Tabungan', icon: 'ads_click', path: '/savings' },
    { name: 'Laporan', icon: 'leaderboard', path: '/reports' },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) => {
    const base = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200";
    if (darkMode) {
      // Mode Gelap: Dasar Hitam, Aktif/Hover Putih
      return isActive
        ? `${base} bg-background-light text-black shadow-lg font-bold`
        : `${base} text-slate-400 hover:bg-background-light hover:text-black hover:shadow-lg`;
    }
    // Mode Terang: Dasar Putih, Aktif/Hover Text Primery to stand out or solid black
    return isActive
      ? `${base} bg-primary text-white shadow-lg font-bold`
      : `${base} text-slate-500 hover:bg-slate-100 hover:text-primary hover:shadow-sm`;
  };

  const handleLogout = async () => {
    localStorage.removeItem('globalDate');
    localStorage.removeItem('has_profile'); // Clear fast-path flag
    await signOut();
  };

  const userName = user?.name || 'User';
const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=7F5AF0&color=fff&length=2`;

  return (
    <aside 
      ref={sidebarRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        transform: touchStartX !== null 
          ? `translateX(${swipeTranslate}px)` 
          : undefined 
      }}
      className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-background-light dark:bg-background-dark border-r border-slate-200 dark:border-white/10 
        flex flex-col h-full shrink-0 select-none
        lg:static lg:translate-x-0
        ${touchStartX !== null ? '' : 'transition-transform duration-300'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="p-8 pt-[calc(2rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="size-10 flex shrink-0 items-center justify-center overflow-hidden rounded-xl">
              <img src="/logo.png" alt="MoneyMind Logo" className="w-full h-full object-contain scale-150" />
            </div>
            <div>
              <h1 className="text-black dark:text-white text-lg font-bold leading-none transition-colors">MoneyMind</h1>
              <p className="text-black/50 dark:text-white/50 text-xs mt-1">Manage your wealth</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={linkClass}
              onClick={() => { if (window.innerWidth < 1024) onClose?.(); }}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </NavLink>
          ))}
          
          <button 
            onClick={onOpenModal}
            className={linkClass({ isActive: false })}
          >
            <span className="material-symbols-outlined text-[22px]">add</span>
            <span className="text-sm font-medium">Transaksi Baru</span>
          </button>
        </nav>
      </div>

      <div className="mt-auto lg:-mt-10 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="flex flex-col gap-2">
          <NavLink 
            to="/settings" 
            className={linkClass}
            onClick={() => { if (window.innerWidth < 1024) onClose?.(); }}
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
            <span className="text-sm font-medium">Pengaturan</span>
          </NavLink>
          
          {/* User Profile Card */}
          <div className="flex items-center gap-3 px-4 py-3 mt-1 rounded-2xl bg-background-light dark:bg-background-dark border border-slate-100 dark:border-white/10 transition-colors">
            <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
              <img 
                src={avatarUrl} 
                alt={userName} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-black dark:text-white truncate transition-colors">{userName}</p>
              <p className="text-[10px] text-black/50 dark:text-white/50 truncate">Pro Member</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="Keluar"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;