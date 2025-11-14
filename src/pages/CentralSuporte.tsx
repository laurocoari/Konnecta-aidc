import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MessageSquare,
  User,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TicketFormDialog } from "@/components/Suporte/TicketFormDialog";
import { TicketDetailDialog } from "@/components/Suporte/TicketDetailDialog";

export default function CentralSuporte() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("todos");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("todos");

  useEffect(() => {
    loadTickets();
  }, [filterStatus, filterPrioridade, activeTab]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(id, nome, email, telefone, empresa),
          ticket_comments(count)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      if (filterPrioridade !== "todos") {
        query = query.eq("prioridade", filterPrioridade);
      }

      if (activeTab === "meus") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("responsavel_id", user.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar profiles separadamente para responsáveis e criadores
      const userIds = [
        ...new Set([
          ...(data || []).map(t => t.responsavel_id).filter(Boolean),
          ...(data || []).map(t => t.created_by).filter(Boolean),
        ])
      ];
      
      let usersMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            usersMap[p.id] = p;
          });
        }
      }

      // Adicionar dados dos usuários aos tickets
      const ticketsWithUsers = (data || []).map(ticket => ({
        ...ticket,
        responsavel: ticket.responsavel_id ? usersMap[ticket.responsavel_id] : null,
        created_by_user: ticket.created_by ? usersMap[ticket.created_by] : null,
      }));

      setTickets(ticketsWithUsers);
    } catch (error: any) {
      console.error("Error loading tickets:", error);
      toast.error("Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleNewTicket = () => {
    setSelectedTicket(null);
    setTicketDialogOpen(true);
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: any; icon: any }> =
      {
        aberto: {
          label: "Aberto",
          variant: "default",
          icon: Clock,
        },
        em_atendimento: {
          label: "Em Atendimento",
          variant: "default",
          icon: AlertCircle,
        },
        resolvido: {
          label: "Resolvido",
          variant: "default",
          icon: CheckCircle2,
        },
        fechado: {
          label: "Fechado",
          variant: "secondary",
          icon: XCircle,
        },
      };
    const config = configs[status] || {
      label: status,
      variant: "default",
      icon: MessageSquare,
    };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const configs: Record<string, { label: string; variant: any }> = {
      baixa: { label: "Baixa", variant: "secondary" },
      media: { label: "Média", variant: "default" },
      alta: { label: "Alta", variant: "default" },
      urgente: { label: "Urgente", variant: "destructive" },
    };
    const config = configs[prioridade] || {
      label: prioridade,
      variant: "default",
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        ticket.numero_ticket?.toLowerCase().includes(term) ||
        ticket.assunto?.toLowerCase().includes(term) ||
        ticket.contact?.nome?.toLowerCase().includes(term) ||
        ticket.contact?.empresa?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Suporte</h1>
          <p className="text-muted-foreground">
            Gerencie tickets de atendimento e suporte aos clientes
          </p>
        </div>
        <Button onClick={handleNewTicket} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="meus">Meus Tickets</TabsTrigger>
          <TabsTrigger value="abertos">Abertos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filtros */}
          <Card className="glass-strong p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, assunto ou contato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterPrioridade}
                onValueChange={setFilterPrioridade}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum ticket encontrado. Clique em "Novo Ticket" para começar.
              </p>
            </Card>
          ) : (
            <Card className="glass-strong">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        {ticket.numero_ticket || `#${ticket.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {ticket.contact?.nome || "N/A"}
                          </div>
                          {ticket.contact?.empresa && (
                            <div className="text-xs text-muted-foreground">
                              {ticket.contact.empresa}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{ticket.assunto}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>
                        {getPrioridadeBadge(ticket.prioridade)}
                      </TableCell>
                      <TableCell>
                        {ticket.responsavel?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <TicketFormDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        ticket={selectedTicket}
        onSuccess={() => {
          loadTickets();
          setSelectedTicket(null);
        }}
      />

      <TicketDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        ticket={selectedTicket}
        onSuccess={loadTickets}
      />
    </div>
  );
}

