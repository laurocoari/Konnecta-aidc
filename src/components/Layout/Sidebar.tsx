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
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "comercial", "financeiro"] },
  { name: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "comercial"] },
  { name: "Funil de Vendas", href: "/funil", icon: TrendingUp, roles: ["admin", "comercial"] },
  { name: "Produtos", href: "/produtos", icon: Package, roles: ["admin", "comercial"] },
  { name: "Propostas", href: "/propostas", icon: FileText, roles: ["admin", "comercial"] },
  { name: "Contratos", href: "/contratos", icon: FileText, roles: ["admin", "comercial", "financeiro"] },
  { name: "Fornecedores", href: "/fornecedores", icon: Building2, roles: ["admin", "comercial"] },
  { name: "Revendedores", href: "/revendedores", icon: UserCheck, roles: ["admin", "comercial"] },
  { name: "Gerenciar Oportunidades", href: "/gerenciar-oportunidades", icon: ClipboardCheck, roles: ["admin", "comercial"] },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, roles: ["admin", "financeiro"] },
  { name: "Configurações", href: "/configuracoes", icon: Settings, roles: ["admin", "comercial", "financeiro"] },
];

const partnerNavigation = [
  { name: "Central do Parceiro", href: "/central-parceiro", icon: LayoutDashboard },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const { userRole } = useAuth();

  const navigation = userRole === "revendedor" ? partnerNavigation : adminNavigation.filter(
    (item) => !item.roles || item.roles.includes(userRole || "")
  );

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
            end={item.href === "/" || item.href === "/central-parceiro"}
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
