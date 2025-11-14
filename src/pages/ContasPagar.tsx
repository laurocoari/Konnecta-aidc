import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  Building2,
  User,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { APFormDialog } from "@/components/Financeiro/APFormDialog";
import { APPaymentDialog } from "@/components/Financeiro/APPaymentDialog";

export default function ContasPagar() {
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [apDialogOpen, setApDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAP, setSelectedAP] = useState<any>(null);

  useEffect(() => {
    loadAccountsPayable();
  }, [filterStatus]);

  const loadAccountsPayable = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("accounts_payable")
        .select(`
          *,
          accounts_payable_payments(count)
        `)
        .order("data_vencimento", { ascending: true });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar beneficiários separadamente
      const beneficiariosMap: Record<string, any> = {};
      
      // Buscar fornecedores
      const supplierIds = (data || [])
        .filter(ap => ap.beneficiario_tipo === "fornecedor")
        .map(ap => ap.beneficiario_id);
      
      if (supplierIds.length > 0) {
        const { data: suppliers } = await supabase
          .from("suppliers")
          .select("id, nome")
          .in("id", supplierIds);
        
        if (suppliers) {
          suppliers.forEach(s => {
            beneficiariosMap[`fornecedor_${s.id}`] = { tipo: "fornecedor", nome: s.nome };
          });
        }
      }

      // Buscar usuários
      const userIds = (data || [])
        .filter(ap => ap.beneficiario_tipo === "usuario")
        .map(ap => ap.beneficiario_id);
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (users) {
          users.forEach(u => {
            beneficiariosMap[`usuario_${u.id}`] = { tipo: "usuario", nome: u.full_name };
          });
        }
      }

      // Adicionar beneficiários aos APs
      const apsWithBeneficiarios = (data || []).map(ap => ({
        ...ap,
        beneficiario: beneficiariosMap[`${ap.beneficiario_tipo}_${ap.beneficiario_id}`] || { nome: "N/A" },
      }));

      // Atualizar status de atrasados
      const hoje = new Date().toISOString().split("T")[0];
      const apsToUpdate = apsWithBeneficiarios.filter(
        (ap) =>
          ap.status === "pendente" &&
          ap.data_vencimento < hoje &&
          ap.valor_pago < ap.valor_total
      );

      if (apsToUpdate.length > 0) {
        for (const ap of apsToUpdate) {
          await supabase
            .from("accounts_payable")
            .update({ status: "atrasado" })
            .eq("id", ap.id);
        }
        // Recarregar dados
        const { data: updatedData } = await query;
        const updatedAps = (updatedData || []).map(ap => ({
          ...ap,
          beneficiario: beneficiariosMap[`${ap.beneficiario_tipo}_${ap.beneficiario_id}`] || { nome: "N/A" },
        }));
        setAccountsPayable(updatedAps);
      } else {
        setAccountsPayable(apsWithBeneficiarios);
      }
    } catch (error: any) {
      console.error("Error loading AP:", error);
      toast.error("Erro ao carregar contas a pagar");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAP = () => {
    setSelectedAP(null);
    setApDialogOpen(true);
  };

  const handleRegisterPayment = (ap: any) => {
    setSelectedAP(ap);
    setPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: any; icon: any }> =
      {
        pendente: {
          label: "Pendente",
          variant: "default",
          icon: Calendar,
        },
        parcialmente_pago: {
          label: "Parcialmente Pago",
          variant: "outline",
          icon: TrendingDown,
        },
        pago: {
          label: "Pago",
          variant: "default",
          icon: DollarSign,
        },
        atrasado: {
          label: "Atrasado",
          variant: "destructive",
          icon: AlertCircle,
        },
        cancelado: {
          label: "Cancelado",
          variant: "secondary",
          icon: AlertCircle,
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

  const filteredAP = accountsPayable.filter((ap) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        ap.beneficiario?.nome?.toLowerCase().includes(term) ||
        ap.origem?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalAP = filteredAP.reduce(
    (sum, ap) => sum + parseFloat(ap.valor_total || 0),
    0
  );
  const totalPago = filteredAP.reduce(
    (sum, ap) => sum + parseFloat(ap.valor_pago || 0),
    0
  );
  const totalAberto = totalAP - totalPago;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Gerencie obrigações de pagamento e despesas
          </p>
        </div>
        <Button onClick={handleNewAP} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta a Pagar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-strong p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAP)}</p>
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
            <p className="text-sm text-muted-foreground">Em Aberto</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalAberto)}
            </p>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="glass-strong p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por beneficiário ou origem..."
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcialmente_pago">Parcialmente Pago</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando contas a pagar...
        </div>
      ) : filteredAP.length === 0 ? (
        <Card className="glass-strong p-12 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma conta a pagar encontrada. Clique em "Nova Conta a Pagar" para
            começar.
          </p>
        </Card>
      ) : (
        <Card className="glass-strong">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAP.map((ap) => {
                const saldo = parseFloat(ap.valor_total || 0) - parseFloat(ap.valor_pago || 0);
                const isOverdue = ap.data_vencimento < new Date().toISOString().split("T")[0] && ap.status !== "pago";
                
                return (
                  <TableRow
                    key={ap.id}
                    className={isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ap.beneficiario_tipo === "fornecedor" ? (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">
                          {ap.beneficiario?.nome || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ap.beneficiario_tipo}</Badge>
                    </TableCell>
                    <TableCell>{ap.origem}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(ap.valor_total)}
                    </TableCell>
                    <TableCell className="text-success">
                      {formatCurrency(ap.valor_pago || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-destructive">
                      {formatCurrency(saldo)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(ap.data_vencimento).toLocaleDateString("pt-BR")}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ap.status)}</TableCell>
                    <TableCell className="text-right">
                      {saldo > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegisterPayment(ap)}
                        >
                          Efetuar Pagamento
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <APFormDialog
        open={apDialogOpen}
        onOpenChange={setApDialogOpen}
        accountPayable={selectedAP}
        onSuccess={() => {
          loadAccountsPayable();
          setSelectedAP(null);
        }}
      />

      <APPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        accountPayable={selectedAP}
        onSuccess={() => {
          loadAccountsPayable();
          setSelectedAP(null);
        }}
      />
    </div>
  );
}
