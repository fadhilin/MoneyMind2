import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Mengambil versi dari package.json
const pkg = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "package.json"),
    "utf-8",
  ),
);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // Aplikasi langsung update saat ada perubahan di GitHub
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "MoneyMind Finance App",
        short_name: "MoneyMind",
        description: "Aplikasi manajemen keuangan pribadi",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable", // Agar ikon PWA terlihat bagus di semua Android launcher
          },
        ],
      },
      devOptions: {
        enabled: true, // Supaya fitur PWA tetap aktif saat Anda menjalankan 'npm run dev'
      },
    }),
  ],
  define: {
    // Menyuntikkan variabel global __APP_VERSION__
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
