import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { useSession } from "./lib/auth-client";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TransaksiInput from "./components/TransaksiInput";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budget from "./pages/Budget";
import Savings from "./pages/Savings";
import Reports from "./pages/Reports";
import ProfileSetup from "./pages/ProfileSetup";
import Settings from "./pages/Settings";
import { Preferences } from "@capacitor/preferences";

// ─── Type Definitions ────────────────────────────────────────────────────────
declare const __APP_VERSION__: string;

// ─── Layout wrapper ──────────────────────────────────────────────────────────
const Layout = ({ darkMode }: { darkMode: boolean }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
