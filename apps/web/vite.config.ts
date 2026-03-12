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
      registerType: "autoUpdate",

      // UBAH BAGIAN INI: Sesuaikan dengan aset statis yang benar-benar ada
      includeAssets: ["logo.png", "vite.svg"],

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
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
