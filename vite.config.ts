import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Habilitar logs detalhados no terminal
    hmr: {
      overlay: true,
    },
  },
  // Logs mais verbosos em desenvolvimento
  logLevel: mode === "development" ? "info" : "warn",
  clearScreen: false, // Não limpar tela para ver logs
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configuração de build com logs
  build: {
    minify: mode === "production",
    sourcemap: mode === "development",
    rollupOptions: {
      output: {
        // Logs durante build
        manualChunks: undefined,
      },
      onLog(level, log, handler) {
        // Mostrar todos os logs durante build
        if (mode === "development") {
          console.log(`[${level}] ${log.message}`);
        }
        handler(level, log);
      },
    },
  },
}));
