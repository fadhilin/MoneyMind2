import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'); // Default fallback
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

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

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
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
      <div className="max-w-md w-full space-y-8 bg-surface-light dark:bg-surface-dark p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-linear-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg shadow-primary/20 mb-6">
            <svg
              className="w-10 h-10 text-white transform -rotate-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-text-light dark:text-text-dark tracking-tight">
            Selamat datang di MoneyMind
          </h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aplikasi keuangan offline Anda. Profil ini hanya disimpan di perangkat Anda.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSetup}>
          <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer mb-4">
              <img 
                src={avatar} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-4 border-primary bg-indigo-50 dark:bg-indigo-900 object-cover" 
              />
              <button 
                type="button" 
                onClick={generateRandomAvatar}
                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary-dark transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Pilih Avatar</span>
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
                placeholder="Siapa namamu?"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-2xl text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mulai Menggunakan Aplikasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
