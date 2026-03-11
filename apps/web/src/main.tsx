import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1. Jumlah percobaan ulang jika API error (1x sudah cukup)
      retry: 1,
      
      // 2. Data Finansial dianggap "fresh" selama 30 detik
      staleTime: 30_000, 

      // 3. PENTING: Refresh otomatis saat user pindah tab
      // Sangat berguna jika kamu habis narik Grab lalu balik ke web Finance ini
      refetchOnWindowFocus: true,

      // 4. PELENGKAP: Hapus cache dari memori setelah 5 menit tidak dipakai
      gcTime: 1000 * 60 * 5,

      // 5. TAMBAHAN: Mencegah refetch berulang saat koneksi tidak stabil
      refetchOnReconnect: 'always',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);
