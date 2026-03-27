import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<string[]>([]);

  const openAvatarPicker = () => {
    const seeds = Array.from({ length: 9 }, () => Math.random().toString(36).substring(7));
    setAvatarOptions(seeds);
    setIsModalOpen(true);
  };

  useEffect(() => {
    async function checkExisting() {
      const existing = await db.profile.toCollection().first();
      if (existing) {
        navigate('/dashboard', { replace: true });
      } else {
        setIsLoading(false);
      }
    }
    checkExisting();
  }, [navigate]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Save locally
    const existing = await db.profile.toCollection().first();
    const deviceId = existing?.id || uuidv4();

    await db.profile.put({
      id: deviceId,
      name: name.trim(),
      avatar: avatar,
      createdAt: existing?.createdAt || new Date().toISOString()
    });

    await Preferences.set({ key: 'has_profile', value: 'true' });
    navigate('/dashboard', { replace: true });
  };

 

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        setIsUpdating(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error upload foto:", error);
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background-light dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-surface-light dark:bg-surface-dark p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white dark:bg-surface-dark rounded-3xl flex items-center justify-center transform rotate-3 shadow-xl border border-gray-100 dark:border-gray-800 mb-8 overflow-hidden">
            <img
              src="/logo.png"
              alt="MoneyMind Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-extrabold text-text-light dark:text-text-dark tracking-tight leading-tight">
            Selamat datang di MoneyMind
          </h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aplikasi keuangan pribadi Anda. Profil ini hanya disimpan secara lokal di perangkat Anda.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSetup}>
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div 
                onClick={openAvatarPicker}
                className="relative"
              >
                <img
                  src={avatar}
                  alt="Avatar"
                  className={`w-28 h-28 rounded-full border-4 border-primary bg-indigo-50 dark:bg-indigo-900 object-cover shadow-2xl transition-all duration-300 group-hover:scale-105 ${isUploading ? 'opacity-50' : ''}`}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                  <span className="material-symbols-outlined text-white text-3xl">edit</span>
                </div>
              </div>

              <div className="absolute -bottom-10 flex gap-3 justify-center w-full">
                <button
                  type="button"
                  onClick={openAvatarPicker}
                  className= "text-white rounded-full shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50"
                  title="Pilih Avatar dari Galeri"  
                >
                  <span className="material-symbols-outlined text-base">face</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className=" text-white rounded-full shadow-md hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer"
                  title="Upload Foto"
                >
                  <span className="material-symbols-outlined text-base">add_a_photo</span>
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-10">
              Ketuk untuk memilih avatar
            </span>
          </div>

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">Nama Anda</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-2xl relative block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark placeholder-gray-400 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                placeholder="Masukkan Nama Anda"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-primary hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Mulai Menggunakan Aplikasi
            </button>
          </div>
        </form>
      </div>

      {/* Modal Popup Avatar */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pilih Avatar</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-tighter">Personalisasi profil Anda</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {avatarOptions.map((seed) => {
                const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                const isSelected = avatar === url;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => {
                      setAvatar(url);
                      setIsModalOpen(false);
                    }}
                    className={`relative aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border-2 transition-all group p-1 ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <img src={url} alt="Option" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                    {isSelected && (
                      <div className="absolute top-1 right-1 size-4 bg-primary text-white rounded-full flex items-center justify-center">
                         <span className="material-symbols-outlined text-[10px]">check</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={openAvatarPicker}
                className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">autorenew</span>
                Muat Avatar Lain
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Gunakan yang Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
