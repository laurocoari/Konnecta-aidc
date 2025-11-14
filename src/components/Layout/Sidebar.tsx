import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NavLink as CustomNavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  FileStack,
  Building2,
  UserCheck,
  DollarSign,
  Settings,
  TrendingUp,
  ClipboardCheck,
  ShoppingCart,
  ShoppingBag,
  Handshake,
  Banknote,
  Headset,
  Briefcase,
  MessageSquare,
  CheckSquare,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

interface MenuSection {
  title: string;
  icon: any;
  items: MenuItem[];
  defaultOpen?: boolean;
  moduleColor: string;
}

// Configuração de cores por módulo
const moduleColors = {
  VENDAS: {
    main: "#3B82F6", // Azul
    hover: "rgba(59, 130, 246, 0.1)",
    active: "rgba(59, 130, 246, 0.15)",
    border: "#3B82F6",
  },
  PRODUTOS: {
    main: "#8B5CF6", // Roxo
    hover: "rgba(139, 92, 246, 0.1)",
    active: "rgba(139, 92, 246, 0.15)",
    border: "#8B5CF6",
  },
  DOCUMENTOS: {
    main: "#10B981", // Verde
    hover: "rgba(16, 185, 129, 0.1)",
    active: "rgba(16, 185, 129, 0.15)",
    border: "#10B981",
  },
  COMPRAS: {
    main: "#F97316", // Laranja
    hover: "rgba(249, 115, 22, 0.1)",
    active: "rgba(249, 115, 22, 0.15)",
    border: "#F97316",
  },
  PARCEIROS: {
    main: "#EC4899", // Rosa
    hover: "rgba(236, 72, 153, 0.1)",
    active: "rgba(236, 72, 153, 0.15)",
    border: "#EC4899",
  },
  FINANCEIRO: {
    main: "#F59E0B", // Amarelo/Ouro
    hover: "rgba(245, 158, 11, 0.1)",
    active: "rgba(245, 158, 11, 0.15)",
    border: "#F59E0B",
  },
  SUPORTE: {
    main: "#06B6D4", // Ciano
    hover: "rgba(6, 182, 212, 0.1)",
    active: "rgba(6, 182, 212, 0.15)",
    border: "#06B6D4",
  },
  CONFIGURACAO: {
    main: "#6B7280", // Cinza
    hover: "rgba(107, 114, 128, 0.1)",
    active: "rgba(107, 114, 128, 0.15)",
    border: "#6B7280",
  },
} as const;

const menuSections: MenuSection[] = [
  {
    title: "Vendas",
    icon: ShoppingCart,
    moduleColor: "VENDAS",
    items: [
      { name: "CRM de Vendas", href: "/crm-vendas", icon: Briefcase, roles: ["admin", "comercial"] },
      { name: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "comercial"] },
      { name: "Funil de Vendas", href: "/funil", icon: TrendingUp, roles: ["admin", "comercial"] },
      { name: "Tarefas", href: "/tarefas", icon: CheckSquare, roles: ["admin", "comercial"] },
    ],
    defaultOpen: true,
  },
  {
    title: "Produtos",
    icon: Package,
    moduleColor: "PRODUTOS",
    items: [
      { name: "Produtos", href: "/produtos", icon: Package, roles: ["admin", "comercial"] },
      { name: "Estoque", href: "/estoque", icon: Warehouse, roles: ["admin", "comercial"] },
      { name: "Marcas", href: "/marcas", icon: Package, roles: ["admin"] },
    ],
    defaultOpen: true,
  },
  {
    title: "Documentos",
    icon: FileText,
    moduleColor: "DOCUMENTOS",
    items: [
      { name: "Propostas", href: "/propostas", icon: FileText, roles: ["admin", "comercial"] },
      { name: "Pedidos de Venda", href: "/pedidos-venda", icon: ShoppingCart, roles: ["admin", "comercial"] },
      { name: "Contratos", href: "/contratos", icon: FileText, roles: ["admin", "comercial", "financeiro"] },
      { name: "Modelos", href: "/modelos", icon: FileStack, roles: ["admin"] },
    ],
  },
  {
    title: "Compras",
    icon: ShoppingBag,
    moduleColor: "COMPRAS",
    items: [
      { name: "Fornecedores", href: "/fornecedores", icon: Building2, roles: ["admin", "comercial"] },
      { name: "Pedidos de Compra", href: "/pedidos-compra", icon: ShoppingCart, roles: ["admin", "comercial"] },
      { name: "Cotações", href: "/cotacoes-compras", icon: ShoppingCart, roles: ["admin", "comercial"] },
    ],
  },
  {
    title: "Parceiros",
    icon: Handshake,
    moduleColor: "PARCEIROS",
    items: [
      { name: "Revendedores", href: "/revendedores", icon: UserCheck, roles: ["admin", "comercial"] },
      { name: "Aprovar Parceiros", href: "/aprovar-parceiros", icon: UserCheck, roles: ["admin"] },
      { name: "Oportunidades", href: "/gerenciar-oportunidades", icon: ClipboardCheck, roles: ["admin", "comercial"] },
    ],
  },
  {
    title: "Financeiro",
    icon: Banknote,
    moduleColor: "FINANCEIRO",
    items: [
      { name: "Contas a Receber", href: "/contas-receber", icon: ArrowDownCircle, roles: ["admin", "financeiro", "comercial"] },
      { name: "Contas a Pagar", href: "/contas-pagar", icon: ArrowUpCircle, roles: ["admin", "financeiro"] },
      { name: "Movimentações", href: "/financeiro", icon: DollarSign, roles: ["admin", "financeiro"] },
      { name: "Contas Bancárias", href: "/contas-bancarias", icon: CreditCard, roles: ["admin", "financeiro"] },
    ],
    defaultOpen: true,
  },
  {
    title: "Suporte",
    icon: Headset,
    moduleColor: "SUPORTE",
    items: [
      { name: "Central de Suporte", href: "/central-suporte", icon: Headset, roles: ["admin", "comercial"] },
      { name: "Abrir Chamados", href: "/abrir-chamados", icon: MessageSquare, roles: ["admin", "comercial"] },
      { name: "Tickets", href: "/tickets", icon: MessageSquare, roles: ["admin", "comercial"] },
    ],
  },
];

const partnerNavigation = [
  { name: "Central do Parceiro", href: "/central-parceiro", icon: LayoutDashboard },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

function MenuItemLink({ item, colors, ItemIcon }: { item: MenuItem; colors: typeof moduleColors.VENDAS; ItemIcon: any }) {
  const location = useLocation();
  const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href + "/"));

  return (
    <CustomNavLink
      to={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        "text-sidebar-foreground/70",
        isActive && "bg-sidebar-accent font-semibold"
      )}
      activeClassName=""
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = colors.hover;
        }
        const icon = e.currentTarget.querySelector("svg");
        if (icon) {
          icon.style.opacity = "1";
          icon.style.color = colors.main;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
        const icon = e.currentTarget.querySelector("svg");
        if (icon) {
          if (isActive) {
            icon.style.opacity = "1";
            icon.style.color = colors.main;
          } else {
            icon.style.opacity = "0.7";
            icon.style.color = "";
          }
        }
      }}
    >
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full transition-all duration-150"
          style={{ backgroundColor: colors.border }}
        />
      )}
      <ItemIcon 
        className="h-4 w-4 transition-all duration-150" 
        style={{ 
          opacity: isActive ? 1 : 0.7,
          color: isActive ? colors.main : undefined,
        }} 
      />
      {item.name}
    </CustomNavLink>
  );
}

function MenuSection({ section, userRole, showDivider }: { section: MenuSection; userRole: string | null; showDivider?: boolean }) {
  const storageKey = `sidebar-section-${section.title}`;
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === "true" : (section.defaultOpen || false);
  });
  
  const filteredItems = section.items.filter(
    (item) => !item.roles || item.roles.includes(userRole || "")
  );

  if (filteredItems.length === 0) return null;

  const SectionIcon = section.icon;
  const colors = moduleColors[section.moduleColor as keyof typeof moduleColors];

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem(storageKey, open.toString());
  };

  return (
    <>
      {showDivider && (
        <div className="h-px bg-border/50 my-2 mx-3" />
      )}
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CollapsibleTrigger className="w-full">
          <div 
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
            style={{
              color: colors.main,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div className="flex items-center gap-3">
              <SectionIcon 
                className="h-5 w-5 transition-opacity duration-150" 
                style={{ color: colors.main }}
              />
              <span>{section.title}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-150" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-150" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-4 mt-1">
          {filteredItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <MenuItemLink
                key={item.name}
                item={item}
                colors={colors}
                ItemIcon={ItemIcon}
              />
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

export function Sidebar() {
  const { userRole } = useAuth();

  if (userRole === "revendedor") {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-bold text-primary">Konnecta CRM</h1>
        </div>
        
        <nav className="flex flex-col gap-1 p-4 overflow-y-auto">
          {partnerNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/central-parceiro"}
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

  const location = useLocation();
  const configColors = moduleColors.CONFIGURACAO;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="flex h-16 items-center border-b border-border px-6 shrink-0">
        <h1 className="text-xl font-bold text-primary">Konnecta CRM</h1>
      </div>
      
      <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1">
        {/* Dashboard sempre visível */}
        <CustomNavLink
          to="/dashboard"
          end
          className={cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 mb-2",
            "text-sidebar-foreground"
          )}
          activeClassName="bg-sidebar-accent font-semibold"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = moduleColors.VENDAS.hover;
            const icon = e.currentTarget.querySelector("svg");
            if (icon) {
              icon.style.opacity = "1";
              icon.style.color = moduleColors.VENDAS.main;
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== "/dashboard") {
              e.currentTarget.style.backgroundColor = "transparent";
              const icon = e.currentTarget.querySelector("svg");
              if (icon) {
                icon.style.opacity = "0.7";
                icon.style.color = "";
              }
            }
          }}
        >
          {location.pathname === "/dashboard" && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full transition-all duration-150"
              style={{ backgroundColor: moduleColors.VENDAS.border }}
            />
          )}
          <LayoutDashboard 
            className="h-5 w-5 transition-all duration-150" 
            style={{ 
              opacity: location.pathname === "/dashboard" ? 1 : 0.7,
              color: location.pathname === "/dashboard" ? moduleColors.VENDAS.main : undefined,
            }} 
          />
          Dashboard
        </CustomNavLink>

        {/* Seções colapsáveis */}
        <div className="space-y-1">
          {menuSections.map((section, index) => (
            <MenuSection 
              key={section.title} 
              section={section} 
              userRole={userRole} 
              showDivider={index > 0}
            />
          ))}
        </div>

        {/* Configurações sempre visível no final */}
        <div className="mt-auto pt-4">
          <div className="h-px bg-border/50 my-2 mx-3" />
          <CustomNavLink
            to="/configuracoes"
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              "text-sidebar-foreground",
              location.pathname === "/configuracoes" && "bg-sidebar-accent font-semibold"
            )}
            activeClassName=""
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = configColors.hover;
              const icon = e.currentTarget.querySelector("svg");
              if (icon) {
                icon.style.opacity = "1";
                icon.style.color = configColors.main;
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/configuracoes") {
                e.currentTarget.style.backgroundColor = "transparent";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) {
                  icon.style.opacity = "0.7";
                  icon.style.color = "";
                }
              }
            }}
          >
            {location.pathname === "/configuracoes" && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full transition-all duration-150"
                style={{ backgroundColor: configColors.border }}
              />
            )}
            <Settings 
              className="h-5 w-5 transition-all duration-150" 
              style={{ 
                opacity: location.pathname === "/configuracoes" ? 1 : 0.7,
                color: location.pathname === "/configuracoes" ? configColors.main : undefined,
              }} 
            />
            Configurações
          </CustomNavLink>
        </div>
      </nav>
    </aside>
  );
}
