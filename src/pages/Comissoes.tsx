import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  DollarSign,
  User,
  TrendingUp,
  Settings,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CommissionRuleFormDialog } from "@/components/Financeiro/CommissionRuleFormDialog";
import { useAuth } from "@/hooks/useAuth";

export default function Comissoes() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("comissoes");

  useEffect(() => {
    if (activeTab === "comissoes") {
      loadCommissions();
    } else {
      loadRules();
    }
  }, [filterStatus, activeTab]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("commissions")
        .select(`
          *,
          user:profiles!commissions_user_id_fkey(id, full_name)
        `)
        .order("data_calculo", { ascending: false });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      console.error("Error loading commissions:", error);
      toast.error("Erro ao carregar comissões");
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("commission_rules")
        .select(`
          *,
          user:profiles!commission_rules_user_id_fkey(id, full_name),
          product:products(id, nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error("Error loading rules:", error);
      toast.error("Erro ao carregar regras");
    } finally {
      setLoading(false);
    }
  };

  const handleNewRule = () => {
    setSelectedRule(null);
    setRuleDialogOpen(true);
  };

  const handleEditRule = (rule: any) => {
    setSelectedRule(rule);
    setRuleDialogOpen(true);
  };

  const handlePayCommission = async (commission: any) => {
    try {
      // Criar conta a pagar para a comissão
      const { data: ap, error: apError } = await supabase
        .from("accounts_payable")
        .insert([
          {
            beneficiario_tipo: "usuario",
            beneficiario_id: commission.user_id,
            origem: "comissao",
            referencia_id: commission.id,
            valor_total: commission.valor_comissao,
            data_emissao: new Date().toISOString().split("T")[0],
            data_vencimento: new Date().toISOString().split("T")[0],
            observacoes: `Comissão referente à venda ${commission.venda_id}`,
          },
        ])
        .select()
        .single();

      if (apError) throw apError;

      // Atualizar comissão com referência à AP
      const { error: updateError } = await supabase
        .from("commissions")
        .update({
          accounts_payable_id: ap.id,
          status: "a_pagar",
        })
        .eq("id", commission.id);

      if (updateError) throw updateError;

      toast.success("Comissão vinculada à conta a pagar!");
      loadCommissions();
    } catch (error: any) {
      console.error("Error paying commission:", error);
      toast.error("Erro ao processar pagamento de comissão");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: any; icon: any }> =
      {
        a_pagar: {
          label: "A Pagar",
          variant: "default",
          icon: Clock,
        },
        pago: {
          label: "Pago",
          variant: "default",
          icon: CheckCircle2,
        },
      };
    const config = configs[status] || {
      label: status,
      variant: "default",
      icon: DollarSign,
    };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const filteredCommissions = commissions.filter((c) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.user?.full_name?.toLowerCase().includes(term) ||
        c.venda_id?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalCommissions = filteredCommissions.reduce(
    (sum, c) => sum + parseFloat(c.valor_comissao || 0),
    0
  );
  const totalPago = filteredCommissions
    .filter((c) => c.status === "pago")
    .reduce((sum, c) => sum + parseFloat(c.valor_comissao || 0), 0);
  const totalAPagar = filteredCommissions
    .filter((c) => c.status === "a_pagar")
    .reduce((sum, c) => sum + parseFloat(c.valor_comissao || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comissões</h1>
          <p className="text-muted-foreground">
            Gerencie regras e cálculos de comissões para vendedores e revendedores
          </p>
        </div>
        <Button onClick={handleNewRule} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="comissoes">Comissões Calculadas</TabsTrigger>
          <TabsTrigger value="regras">Regras de Comissão</TabsTrigger>
        </TabsList>

        <TabsContent value="comissoes" className="space-y-4">
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-strong p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Comissões</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCommissions)}</p>
              </div>
            </Card>
            <Card className="glass-strong p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(totalPago)}
                </p>
              </div>
            </Card>
            <Card className="glass-strong p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(totalAPagar)}
                </p>
              </div>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="glass-strong p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por vendedor ou venda..."
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
                  <SelectItem value="a_pagar">A Pagar</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando comissões...
            </div>
          ) : filteredCommissions.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma comissão encontrada.
              </p>
            </Card>
          ) : (
            <Card className="glass-strong">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Valor Base</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Cálculo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {c.user?.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.venda_tipo}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {c.venda_id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(c.valor_base)}</TableCell>
                      <TableCell>{c.percentual}%</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(c.valor_comissao)}
                      </TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell>
                        {new Date(c.data_calculo).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "a_pagar" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePayCommission(c)}
                          >
                            Pagar Comissão
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="regras" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando regras...
            </div>
          ) : rules.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma regra de comissão encontrada. Clique em "Nova Regra" para
                começar.
              </p>
            </Card>
          ) : (
            <Card className="glass-strong">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Tipo Base</TableHead>
                    <TableHead>Produto/Categoria</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead>Valor Fixo</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {rule.user?.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.tipo_base}</Badge>
                      </TableCell>
                      <TableCell>
                        {rule.product?.nome || rule.categoria_id || "Geral"}
                      </TableCell>
                      <TableCell>
                        {rule.percentual ? `${rule.percentual}%` : "-"}
                      </TableCell>
                      <TableCell>
                        {rule.valor_fixo
                          ? formatCurrency(rule.valor_fixo)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {new Date(rule.vigencia_inicio).toLocaleDateString("pt-BR")}
                          </div>
                          {rule.vigencia_fim && (
                            <div className="text-muted-foreground">
                              até{" "}
                              {new Date(rule.vigencia_fim).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.status === "ativa" ? "default" : "secondary"}
                        >
                          {rule.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Settings className="h-4 w-4" />
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

      <CommissionRuleFormDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={selectedRule}
        onSuccess={() => {
          loadRules();
          setSelectedRule(null);
        }}
      />
    </div>
  );
}
