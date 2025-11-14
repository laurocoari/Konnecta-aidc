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
import Marcas from "./pages/Marcas";
import Propostas from "./pages/Propostas";
import PropostaPublica from "./pages/PropostaPublica";
import Modelos from "./pages/Modelos";
import Fornecedores from "./pages/Fornecedores";
import Revendedores from "./pages/Revendedores";
import Contratos from "./pages/Contratos";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import AuthParceiro from "./pages/AuthParceiro";
import CentralParceiro from "./pages/CentralParceiro";
import CatalogoProdutos from "./pages/CatalogoProdutos";
import AprovarParceiros from "./pages/AprovarParceiros";
import GerenciarOportunidades from "./pages/GerenciarOportunidades";
import CotacoesCompras from "./pages/CotacoesCompras";
import CRMVendas from "./pages/CRMVendas";
import PedidosCompra from "./pages/PedidosCompra";
import CentralSuporte from "./pages/CentralSuporte";
import Tarefas from "./pages/Tarefas";
import Estoque from "./pages/Estoque";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Comissoes from "./pages/Comissoes";
import ContasBancarias from "./pages/ContasBancarias";
import PedidosVenda from "./pages/PedidosVenda";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import { logger } from "@/lib/logger";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    logger.info("APP", "Aplicação React inicializada");
    logger.info("APP", `Modo: ${import.meta.env.MODE}`);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/parceiro" element={<AuthParceiro />} />
          <Route path="/proposta/:codigo" element={<PropostaPublica />} />
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
                        <Route path="/marcas" element={<Marcas />} />
                        <Route path="/propostas" element={<Propostas />} />
                         <Route path="/modelos" element={<Modelos />} />
                         <Route path="/contratos" element={<Contratos />} />
                        <Route path="/fornecedores" element={<Fornecedores />} />
                        <Route path="/revendedores" element={<Revendedores />} />
                        <Route path="/financeiro" element={<Financeiro />} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        <Route path="/central-parceiro" element={<CentralParceiro />} />
                        <Route path="/catalogo-produtos" element={<CatalogoProdutos />} />
                        <Route path="/aprovar-parceiros" element={<AprovarParceiros />} />
                        <Route path="/gerenciar-oportunidades" element={<GerenciarOportunidades />} />
                        <Route path="/cotacoes-compras" element={<CotacoesCompras />} />
                        <Route path="/crm-vendas" element={<CRMVendas />} />
                        <Route path="/pedidos-compra" element={<PedidosCompra />} />
                        <Route path="/central-suporte" element={<CentralSuporte />} />
                        <Route path="/tarefas" element={<Tarefas />} />
                        <Route path="/estoque" element={<Estoque />} />
                        <Route path="/contas-receber" element={<ContasReceber />} />
                        <Route path="/contas-pagar" element={<ContasPagar />} />
                        <Route path="/comissoes" element={<Comissoes />} />
                        <Route path="/contas-bancarias" element={<ContasBancarias />} />
                        <Route path="/pedidos-venda" element={<PedidosVenda />} />
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
};

export default App;
