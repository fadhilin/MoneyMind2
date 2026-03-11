import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Mengambil versi dari package.json
const pkg = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf-8')
);

export default defineConfig({
  plugins: [react()],
  define: {
    // Menyuntikkan variabel global __APP_VERSION__
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});