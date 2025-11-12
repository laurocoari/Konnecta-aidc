import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from "./lib/logger";

// Log de inicialização do sistema
logger.info("SYSTEM", "🚀 Iniciando aplicação Konnecta AIDC");
logger.info("SYSTEM", `Timestamp: ${new Date().toISOString()}`);

const rootElement = document.getElementById("root");

if (!rootElement) {
  logger.error("SYSTEM", "Elemento root não encontrado!");
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

logger.info("SYSTEM", "✅ Aplicação React renderizada com sucesso");
