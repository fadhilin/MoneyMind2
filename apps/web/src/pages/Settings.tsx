import { useState, useRef, type Dispatch, type SetStateAction } from 'react';
import { signOut } from '../lib/auth-client';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/db';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;
}

const Settings = ({ darkMode, setDarkMode }: SettingsProps) => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { user } = useAuth();

  // ─── State untuk Edit Profil ───────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notif = settings?.notificationsEnabled ?? true;
  const userName = user?.name || 'User';
  
  // Prioritaskan gambar dari database, fallback ke ui-avatars
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=7F5AF0&color=fff&size=128&length=2`;

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleNotifToggle = () => {
    updateSettings.mutate({ notificationsEnabled: !notif });
  };

  const handleLogout = async () => {
    localStorage.removeItem('globalDate');
    localStorage.removeItem('has_profile');
    await signOut();
  };

  // Simpan perubahan nama
  const handleSaveName = async () => {
    if (!newName.trim() || newName === userName) {
      setIsEditing(false);
      return;
    }
    
    setIsUpdating(true);
    const existing = await db.profile.toCollection().first();
    if (existing) {
      await db.profile.update(existing.id, { name: newName.trim() });
    }
    setIsUpdating(false);
    setIsEditing(false);
  };

  // Upload dan simpan perubahan foto
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const existing = await db.profile.toCollection().first();
        if (existing) {
          await db.profile.update(existing.id, { avatar: base64String });
        }
        
        setIsUpdating(false);
      };
      reader.readAsDataURL(file);

      // (Optional) Masih bisa push ke server di background jika mau
      const formData = new FormData();
      formData.append('avatar', file);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/upload-profile`, {
        method: 'POST',
        body: formData,
      }).catch(err => console.error("Server upload failed, but local updated:", err));

    } catch (error) {
      console.error("Error upload foto:", error);
      setIsUpdating(false);
    }
  };

  // Fungsi Hapus Foto
  const handleRemoveImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      const existing = await db.profile.toCollection().first();
      if (existing) {
        await db.profile.update(existing.id, { avatar: '' });
      }
    } catch (error) {
      console.error("Error hapus foto:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 animate-in fade-in zoom-in-95 duration-500 pb-20">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-black dark:text-white transition-colors">Pengaturan</h2>
      <div className="bg-background-light dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-4 md:space-y-6 transition-colors shadow-sm">

        {/* User Profile Card */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 p-5 md:p-6 bg-linear-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5 border border-primary/20 dark:border-primary/30 rounded-2xl relative">
          
          {/* Avatar Area Container */}
          <div className="relative group shrink-0">
            {/* Bagian Foto yang bisa di-klik */}
            <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatarUrl}
                alt={userName}
                className={`w-20 h-20 md:w-16 md:h-16 rounded-2xl md:rounded-2xl object-cover shadow-lg shadow-primary/20 ${isUpdating ? 'opacity-50' : 'group-hover:opacity-75'} transition-opacity`}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-2xl">
                 <span className="material-symbols-outlined text-white drop-shadow-md">photo_camera</span>
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Tombol Hapus: Hanya muncul jika user memiliki custom image */}
            {user?.avatar && (
              <button
                onClick={handleRemoveImage}
                disabled={isUpdating}
                className="absolute -top-1 -right-1 md:-right-3 rounded-full shadow-sm z-10"
                title="Hapus Foto Profil"
              >
                <span 
                  className="material-symbols-outlined block text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                  style={{ fontSize: '18px' }}
                >
                  delete
                </span>
              </button>
            )}
          </div>

          {/* User Info & Edit Name */}
          <div className="flex-1 min-w-0 w-full text-center lg:text-left">
            {isEditing ? (
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-2 py-1 text-sm rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-black dark:text-white outline-hidden focus:ring-2 focus:ring-primary w-full max-w-50"
                  autoFocus
                  disabled={isUpdating}
                />
                <button onClick={handleSaveName} disabled={isUpdating} className="text-primary hover:text-primary/80 hover:cursor-pointer p-1">
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                </button>
                <button onClick={() => setIsEditing(false)} disabled={isUpdating} className="text-red-500 hover:text-red-400 hover:cursor-pointer p-1">
                  <span className="material-symbols-outlined text-xl">cancel</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-8 lg:hidden" aria-hidden="true" /> {/* Spacer to balance edit button */}
                <p className="text-xl md:text-lg font-bold text-black dark:text-white truncate">{userName}</p>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:cursor-pointer transition-colors"
                >
                   <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
            )}

            <div className="mt-2 flex justify-center lg:justify-start">
            </div>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between p-4 md:p-5 bg-background-light dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl transition-colors">
          <div className="flex-1 pr-4">
            <p className="font-bold text-sm md:text-base text-black dark:text-white transition-colors">Mode Gelap</p>
            <p className="text-[11px] md:text-xs text-black/50 dark:text-white/50">Sesuaikan tampilan dengan preferensi Anda</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 border shrink-0 ${darkMode ? 'bg-primary border-transparent' : 'bg-slate-200 border-transparent'}`}
          >
            <div className={`absolute top-0.5 size-4.5 bg-white rounded-full transition-all duration-300 shadow-sm ${darkMode ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Notification Toggle */}
        <div className="flex items-center justify-between p-4 md:p-5 bg-background-light dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl transition-colors">
          <div className="flex-1 pr-4">
            <p className="font-bold text-sm md:text-base text-black dark:text-white transition-colors">Notifikasi</p>
            <p className="text-[11px] md:text-xs text-black/50 dark:text-white/50">Dapatkan pengingat anggaran harian</p>
          </div>
          <button
            onClick={handleNotifToggle}
            disabled={isLoading || updateSettings.isPending}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 border shrink-0 ${notif ? 'bg-primary border-transparent' : 'bg-slate-200 border-transparent'} disabled:opacity-60`}
          >
            <div className={`absolute top-0.5 size-4.5 bg-white rounded-full transition-all duration-300 shadow-sm ${notif ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Logout Section */}
        <div className="pt-4 md:pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all"
          >
            <span className="material-symbols-outlined text-lg">delete_forever</span>
            Hapus Semua Data Lokal
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;