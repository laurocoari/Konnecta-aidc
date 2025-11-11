import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Building2,
  UserCheck,
  DollarSign,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Funil de Vendas", href: "/funil", icon: TrendingUp },
  { name: "Produtos", href: "/produtos", icon: Package },
  { name: "Propostas", href: "/propostas", icon: FileText },
  { name: "Contratos", href: "/contratos", icon: FileText },
  { name: "Fornecedores", href: "/fornecedores", icon: Building2 },
  { name: "Revendedores", href: "/revendedores", icon: UserCheck },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-border px-6">
        <h1 className="text-xl font-bold text-primary">Konnecta CRM</h1>
      </div>
      
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            activeClassName="bg-sidebar-accent text-primary font-semibold"
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
