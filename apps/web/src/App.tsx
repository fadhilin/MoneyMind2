import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useSession } from "./lib/auth-client";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TransaksiInput from "./components/TransaksiInput";
import QuickInput from "./components/QuickInput";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budget from "./pages/Budget";
import Savings from "./pages/Savings";
import Reports from "./pages/Reports";
import ProfileSetup from "./pages/ProfileSetup";
import Settings from "./pages/Settings";
import { Preferences } from "@capacitor/preferences";
import { LocalNotifications } from "@capacitor/local-notifications";

// ─── Type Definitions ────────────────────────────────────────────────────────
declare const __APP_VERSION__: string;

// ─── Layout wrapper ──────────────────────────────────────────────────────────
const Layout = ({ darkMode }: { darkMode: boolean }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [reminderPopup, setReminderPopup] = useState<{name: string; amount?: number}[] | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check reminders on startup
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('reminder_popup_shown');
    if (alreadyShown) return;
    
    Preferences.get({ key: 'payment_reminders' }).then(({ value }) => {
      if (!value) return;
      const reminders = JSON.parse(value);
      const today = new Date().getDate();
      const dueToday = reminders.filter((r: { dayOfMonth: number; enabled: boolean }) => r.enabled && r.dayOfMonth === today);
      if (dueToday.length > 0) {
        setReminderPopup(dueToday);
        sessionStorage.setItem('reminder_popup_shown', 'true');
      }
    });

    // Request native notification permissions safely
    if (typeof LocalNotifications !== 'undefined' && LocalNotifications.checkPermissions) {
      LocalNotifications.checkPermissions().then((perms) => {
        if (perms.display !== 'granted') {
          LocalNotifications.requestPermissions();
        }
      }).catch(err => console.warn('Notification permission check failed:', err));
    }
  }, []);

  useEffect(() => {
    if (location.pathname === "/quick") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsQuickInputOpen(true);
      navigate("/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleOpenQuick = () => setIsQuickInputOpen(true);
    const handleOpenIncome = () => setIsModalOpen(true);
    window.addEventListener("open-quick-input", handleOpenQuick);
    window.addEventListener("open-income-modal", handleOpenIncome);
    return () => {
      window.removeEventListener("open-quick-input", handleOpenQuick);
      window.removeEventListener("open-income-modal", handleOpenIncome);
    };
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-background-light dark:bg-background-dark transition-colors duration-300 text-black dark:text-white">
      <Sidebar
        darkMode={darkMode}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenModal={() => {
          setIsModalOpen(true);
          setSidebarOpen(false);
        }}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 transition-all duration-300">
        <Header
          darkMode={darkMode}
          isSidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="mt-4 pb-20 lg:pb-4">
          <Outlet />
        </div>
      </main>

      <TransaksiInput
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      <QuickInput
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
      />

      {/* Mobile Quick Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-white/80 dark:bg-[#110e1c]/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-around px-2 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
            {/* Catat Pengeluaran */}
            <button
              onClick={() => setIsQuickInputOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all group min-w-[72px]"
            >
              <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">remove_circle</span>
              <span className="text-[9px] font-bold tracking-tight">Pengeluaran</span>
            </button>

            {/* Home */}
            <button
              onClick={() => navigate("/dashboard")}
              className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl text-primary hover:bg-primary/10 active:scale-95 transition-all group min-w-[72px] relative"
            >
              <div className="absolute -top-5 bg-primary text-white size-12 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform ring-4 ring-white dark:ring-[#110e1c]">
                <span className="material-symbols-outlined text-2xl">home</span>
              </div>
              <span className="text-[9px] font-bold tracking-tight mt-7">Beranda</span>
            </button>

            {/* Catat Pemasukan */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl text-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition-all group min-w-[72px]"
            >
              <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">add_circle</span>
              <span className="text-[9px] font-bold tracking-tight">Pemasukan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reminder Popup */}
      {reminderPopup && reminderPopup.length > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#151121] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-amber-500/30 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <span className="material-symbols-outlined text-amber-500 text-3xl">alarm</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-black dark:text-white">Pengingat Hari Ini</h3>
                <p className="text-xs text-slate-500">Ada pembayaran yang jatuh tempo</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              {reminderPopup.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  <span className="material-symbols-outlined text-amber-500">event_upcoming</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-black dark:text-white">{r.name}</p>
                    {r.amount && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">Rp {r.amount.toLocaleString('id-ID')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setReminderPopup(null)}
              className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              OK, Mengerti
            </button>
          </div>
        </div>
      )}
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
    return <Navigate to="/setup" replace />;
  }

  return <Layout darkMode={darkMode} />;
};
function App() {
  // ─── 2. Logic Cache Busting (Force Update) ──────────────────────────────────
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersion =
          typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
        const { value: savedVersion } = await Preferences.get({ key: "app_version" });

        if (savedVersion && savedVersion !== currentVersion) {
          await Preferences.set({ key: "app_version", value: currentVersion });
          window.location.reload();
        } else if (!savedVersion) {
          await Preferences.set({ key: "app_version", value: currentVersion });
        }
      } catch (e) {
        console.warn("Version check failed:", e);
      }
    };
    checkVersion();
  }, []);

  // ─── 3. Offline Background Sync ─────────────────────────────────────────────
  useEffect(() => {
    import("./lib/sync")
      .then(({ startSync, stopSync }) => {
        startSync();
        return () => stopSync();
      })
      .catch((err) => console.error("Sync init failed:", err));
  }, []);

  // ─── 4. Dark Mode Logic ────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const loadTheme = async () => {
      const { value: savedTheme } = await Preferences.get({ key: "theme" });
      setDarkMode(savedTheme !== "light");
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const updateTheme = async () => {
      if (darkMode) {
        document.documentElement.classList.add("dark");
        await Preferences.set({ key: "theme", value: "dark" });
      } else {
        document.documentElement.classList.remove("dark");
        await Preferences.set({ key: "theme", value: "light" });
      }
    };
    updateTheme();
  }, [darkMode]);

  return (
    <Router>
      <Routes>
        <Route path="/setup" element={<ProfileSetup />} />
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
        <Route path="/quick" element={<ProtectedRoutes darkMode={darkMode} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
