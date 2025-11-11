import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Funil from "./pages/Funil";
import Produtos from "./pages/Produtos";
import Propostas from "./pages/Propostas";
import ModelosPropostas from "./pages/ModelosPropostas";
import Fornecedores from "./pages/Fornecedores";
import Revendedores from "./pages/Revendedores";
import Contratos from "./pages/Contratos";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import AuthParceiro from "./pages/AuthParceiro";
import CentralParceiro from "./pages/CentralParceiro";
import GerenciarOportunidades from "./pages/GerenciarOportunidades";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/parceiro" element={<AuthParceiro />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen w-full bg-background">
                  <Sidebar />
                  <div className="flex flex-1 flex-col">
                    <Header />
                    <main className="ml-64 mt-16 flex-1 p-6">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/clientes" element={<Clientes />} />
                        <Route path="/funil" element={<Funil />} />
                        <Route path="/produtos" element={<Produtos />} />
                        <Route path="/propostas" element={<Propostas />} />
                        <Route path="/modelos-propostas" element={<ModelosPropostas />} />
                        <Route path="/contratos" element={<Contratos />} />
                        <Route path="/fornecedores" element={<Fornecedores />} />
                        <Route path="/revendedores" element={<Revendedores />} />
                        <Route path="/financeiro" element={<Financeiro />} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        <Route path="/central-parceiro" element={<CentralParceiro />} />
                        <Route path="/gerenciar-oportunidades" element={<GerenciarOportunidades />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
