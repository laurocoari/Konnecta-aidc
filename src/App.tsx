import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Funil from "./pages/Funil";
import Produtos from "./pages/Produtos";
import Propostas from "./pages/Propostas";
import Fornecedores from "./pages/Fornecedores";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <Header />
            <main className="ml-64 mt-16 flex-1 p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/funil" element={<Funil />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/propostas" element={<Propostas />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
