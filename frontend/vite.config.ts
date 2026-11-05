import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [vue()],
  base: command === "serve" ? "/" : "/vue/",
  publicDir: false,
  build: {
    outDir: "../public/vue",
    emptyOutDir: true,
    target: "es2022",
  },
  server: {
    port: Number(process.env.FRONTEND_PORT || 3000),
    strictPort: true,
    host: "0.0.0.0",
    proxy: { "/api": { target: process.env.VITE_API_TARGET || "http://127.0.0.1:3001", changeOrigin: false } },
  },
}));
