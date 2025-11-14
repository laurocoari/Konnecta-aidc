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
  Users,
  TrendingUp,
  Mail,
  Phone,
  Building2,
  Edit,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ContactFormDialog } from "@/components/CRM/ContactFormDialog";
import { OpportunityFormDialog } from "@/components/CRM/OpportunityFormDialog";
import { KanbanBoard } from "@/components/CRM/KanbanBoard";

export default function CRMVendas() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEtapa, setFilterEtapa] = useState<string>("todos");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("contatos");

  useEffect(() => {
    loadContacts();
    loadOpportunities();
  }, []);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          opportunities_crm(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar profiles separadamente para os responsáveis
      const responsavelIds = [...new Set((data || []).map(c => c.responsavel_id).filter(Boolean))];
      let responsaveisMap: Record<string, any> = {};
      
      if (responsavelIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", responsavelIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            responsaveisMap[p.id] = p;
          });
        }
      }

      // Adicionar dados do responsável aos contatos
      const contactsWithResponsavel = (data || []).map(contact => ({
        ...contact,
        responsavel: contact.responsavel_id ? responsaveisMap[contact.responsavel_id] : null,
      }));

      setContacts(contactsWithResponsavel);
    } catch (error: any) {
      console.error("Error loading contacts:", error);
      toast.error("Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities_crm")
        .select(`
          *,
          contact:contacts(id, nome, email, telefone, empresa)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar profiles separadamente para os criadores
      const createdByIds = [...new Set((data || []).map(o => o.created_by).filter(Boolean))];
      let createdByMap: Record<string, any> = {};
      
      if (createdByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", createdByIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            createdByMap[p.id] = p;
          });
        }
      }

      // Adicionar dados do criador às oportunidades
      const opportunitiesWithCreator = (data || []).map(opp => ({
        ...opp,
        created_by_user: opp.created_by ? createdByMap[opp.created_by] : null,
      }));

      setOpportunities(opportunitiesWithCreator);
    } catch (error: any) {
      console.error("Error loading opportunities:", error);
      toast.error("Erro ao carregar oportunidades");
    }
  };

  const handleNewContact = () => {
    setSelectedContact(null);
    setContactDialogOpen(true);
  };

  const handleEditContact = (contact: any) => {
    setSelectedContact(contact);
    setContactDialogOpen(true);
  };

  const handleNewOpportunity = (contact?: any) => {
    setSelectedOpportunity(null);
    if (contact) {
      setSelectedContact(contact);
    }
    setOpportunityDialogOpen(true);
  };

  const handleEditOpportunity = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
    setOpportunityDialogOpen(true);
  };

  const getTipoBadge = (tipo: string) => {
    const configs: Record<string, { label: string; variant: any }> = {
      lead: { label: "Lead", variant: "secondary" },
      cliente: { label: "Cliente", variant: "default" },
      parceiro: { label: "Parceiro", variant: "outline" },
    };
    const config = configs[tipo] || { label: tipo, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getEtapaBadge = (etapa: string) => {
    const configs: Record<string, { label: string; variant: any }> = {
      novo: { label: "Novo", variant: "secondary" },
      qualificado: { label: "Qualificado", variant: "default" },
      proposta: { label: "Proposta", variant: "outline" },
      negociacao: { label: "Negociação", variant: "default" },
      ganho: { label: "Ganho", variant: "default" },
      perdido: { label: "Perdido", variant: "destructive" },
    };
    const config = configs[etapa] || { label: etapa, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredContacts = contacts.filter((contact) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !contact.nome?.toLowerCase().includes(term) &&
        !contact.email?.toLowerCase().includes(term) &&
        !contact.empresa?.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    if (filterTipo !== "todos" && contact.tipo !== filterTipo) {
      return false;
    }
    if (filterEtapa !== "todos" && contact.etapa_funil !== filterEtapa) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM de Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie contatos, leads e oportunidades de vendas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleNewOpportunity()}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Nova Oportunidade
          </Button>
          <Button onClick={handleNewContact} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Contato
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contatos">Contatos e Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline de Oportunidades</TabsTrigger>
        </TabsList>

        <TabsContent value="contatos" className="space-y-4">
          {/* Filtros */}
          <Card className="glass-strong p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                <SelectTrigger>
                  <SelectValue placeholder="Etapa do Funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Etapas</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="ganho">Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Tabela de Contatos */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando contatos...
            </div>
          ) : filteredContacts.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum contato encontrado. Clique em "Novo Contato" para começar.
              </p>
            </Card>
          ) : (
            <Card className="glass-strong">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contact.nome}</div>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.telefone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.empresa ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {contact.empresa}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getTipoBadge(contact.tipo)}</TableCell>
                      <TableCell>{getEtapaBadge(contact.etapa_funil)}</TableCell>
                      <TableCell>
                        {contact.responsavel?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNewOpportunity(contact)}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <KanbanBoard
            opportunities={opportunities}
            onOpportunityClick={handleEditOpportunity}
            onUpdate={loadOpportunities}
          />
        </TabsContent>
      </Tabs>

      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contact={selectedContact}
        onSuccess={() => {
          loadContacts();
          setSelectedContact(null);
        }}
      />

      <OpportunityFormDialog
        open={opportunityDialogOpen}
        onOpenChange={setOpportunityDialogOpen}
        opportunity={selectedOpportunity}
        contact={selectedContact}
        onSuccess={() => {
          loadOpportunities();
          loadContacts();
          setSelectedOpportunity(null);
          setSelectedContact(null);
        }}
      />
    </div>
  );
}

