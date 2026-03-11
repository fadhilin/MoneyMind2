import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useSession } from './lib/auth-client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TransaksiInput from './components/TransaksiInput';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Savings from './pages/Savings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Settings from './pages/Settings';

// ─── Global Version Definition (For TS) ──────────────────────────────────────
declare const __APP_VERSION__: string;

// ─── Layout wrapper ──────────────────────────────────────────────────────────
const Layout = ({ darkMode }: { darkMode: boolean }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  // Robust Background Scroll Lock
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Handle Swipe Gesture for Overlay Area
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }

    const swipeDistance = touchCurrentX - touchStartX;
    // Close if swiped left more than 80px
    if (swipeDistance < -80) {
      setSidebarOpen(false);
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background-light dark:bg-background-dark transition-colors duration-300">
      {/* Sidebar - Desktop hidden lg, Mobile absolute/fixed */}
      <Sidebar 
        darkMode={darkMode} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onOpenModal={() => {
          setIsModalOpen(true);
          setSidebarOpen(false); // Auto close sidebar when modal opens
        }}
      />
      
      {/* Overlay for mobile sidebar - Transparent but clickable & swipeable */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      )}

      <main 
        className={`
          flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 transition-all duration-300
          ${sidebarOpen ? 'max-lg:blur-[2px] max-lg:overflow-hidden max-lg:touch-none max-lg:pointer-events-none select-none' : ''}
        `}
      >
        <Header 
          darkMode={darkMode} 
          isSidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)} 
        />
        <div className="mt-4">
          <Outlet />
        </div>
      </main>

      <TransaksiInput 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

// ─── Auth guard ───────────────────────────────────────────────────────────────
const ProtectedRoutes = ({ darkMode }: { darkMode: boolean }) => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout darkMode={darkMode} />;
};

function App() {
  // ─── 1. Logic Cache Busting (Force Update) ──────────────────────────────────
  useEffect(() => {
    const currentVersion = __APP_VERSION__;
    const savedVersion = localStorage.getItem('app_version');

    if (savedVersion !== currentVersion) {
      console.log(`Update terdeteksi: v${savedVersion} -> v${currentVersion}`);
      
      // Simpan versi baru ke localStorage
      localStorage.setItem('app_version', currentVersion);
      
      // Bersihkan cache lama dan reload paksa agar user dapat JS/CSS terbaru
      window.location.reload();
    }
  }, []);

  // ─── Dark Mode Logic ────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme !== 'light'; // Default to true if not explicitly 'light'
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route element={<ProtectedRoutes darkMode={darkMode} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/settings"
            element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} />}
          />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;