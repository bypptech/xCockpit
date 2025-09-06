import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    hmr: {
      overlay: true,  // エラーオーバーレイを表示
    },
    watch: {
      usePolling: true,  // ファイルシステムの変更を確実に検出
      interval: 100,     // ポーリング間隔（ミリ秒）
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PORT 
          ? `http://localhost:${process.env.VITE_BACKEND_PORT}` 
          : process.env.PORT 
          ? `http://localhost:${process.env.PORT}` 
          : 'http://localhost:5001',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_BACKEND_PORT 
          ? `ws://localhost:${process.env.VITE_BACKEND_PORT}` 
          : process.env.PORT 
          ? `ws://localhost:${process.env.PORT}` 
          : 'ws://localhost:5001',
        ws: true,
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
