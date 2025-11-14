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
  User,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ARFormDialog } from "@/components/Financeiro/ARFormDialog";
import { ARPaymentDialog } from "@/components/Financeiro/ARPaymentDialog";
import { ExportButton } from "@/components/ExportButton";
import { Edit } from "lucide-react";

export default function ContasReceber() {
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [arDialogOpen, setArDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAR, setSelectedAR] = useState<any>(null);
  const [editingAR, setEditingAR] = useState<any>(null);

  useEffect(() => {
    loadAccountsReceivable();
  }, [filterStatus]);

  const loadAccountsReceivable = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("accounts_receivable")
        .select(`
          *,
          contact:contacts(id, nome, email, telefone, empresa),
          accounts_receivable_payments(count)
        `)
        .order("data_vencimento", { ascending: true });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Atualizar status de atrasados
      const hoje = new Date().toISOString().split("T")[0];
      const arsToUpdate = (data || []).filter(
        (ar) =>
          ar.status === "pendente" &&
          ar.data_vencimento < hoje &&
          ar.valor_pago < ar.valor_total
      );

      if (arsToUpdate.length > 0) {
        for (const ar of arsToUpdate) {
          await supabase
            .from("accounts_receivable")
            .update({ status: "atrasado" })
            .eq("id", ar.id);
        }
        // Recarregar dados
        const { data: updatedData } = await query;
        setAccountsReceivable(updatedData || []);
      } else {
        setAccountsReceivable(data || []);
      }
    } catch (error: any) {
      console.error("Error loading AR:", error);
      toast.error("Erro ao carregar contas a receber");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAR = () => {
    setEditingAR(null);
    setSelectedAR(null);
    setArDialogOpen(true);
  };

  const handleEditAR = (ar: any) => {
    setEditingAR(ar);
    setArDialogOpen(true);
  };

  const handleRegisterPayment = (ar: any) => {
    setSelectedAR(ar);
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
          icon: TrendingUp,
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

  const filteredAR = accountsReceivable.filter((ar) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        ar.contact?.nome?.toLowerCase().includes(term) ||
        ar.contact?.empresa?.toLowerCase().includes(term) ||
        ar.origem?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalAR = filteredAR.reduce(
    (sum, ar) => sum + parseFloat(ar.valor_total || 0),
    0
  );
  const totalPago = filteredAR.reduce(
    (sum, ar) => sum + parseFloat(ar.valor_pago || 0),
    0
  );
  const totalAberto = totalAR - totalPago;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas a Receber</h1>
          <p className="text-muted-foreground">
            Gerencie valores a receber de clientes e vendas
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename="contas-a-receber"
            title="Relatório de Contas a Receber"
            columns={[
              { header: "Cliente", key: "cliente", width: 30 },
              { header: "Origem", key: "origem", width: 15 },
              { header: "Valor Total", key: "valor_total", width: 15 },
              { header: "Valor Pago", key: "valor_pago", width: 15 },
              { header: "Saldo", key: "saldo", width: 15 },
              { header: "Data Emissão", key: "data_emissao", width: 15 },
              { header: "Data Vencimento", key: "data_vencimento", width: 15 },
              { header: "Status", key: "status", width: 15 },
            ]}
            data={filteredAR.map((ar) => {
              const saldo = parseFloat(ar.valor_total || 0) - parseFloat(ar.valor_pago || 0);
              return {
                cliente: ar.contact?.nome || ar.contact?.empresa || "N/A",
                origem: ar.origem,
                valor_total: parseFloat(ar.valor_total || 0),
                valor_pago: parseFloat(ar.valor_pago || 0),
                saldo,
                data_emissao: ar.data_emissao,
                data_vencimento: ar.data_vencimento,
                status: ar.status,
              };
            })}
          />
          <Button onClick={handleNewAR} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta a Receber
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-strong p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total a Receber</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAR)}</p>
          </div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Recebido</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(totalPago)}
            </p>
          </div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Em Aberto</p>
            <p className="text-2xl font-bold text-warning">
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
              placeholder="Buscar por cliente ou origem..."
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
          Carregando contas a receber...
        </div>
      ) : filteredAR.length === 0 ? (
        <Card className="glass-strong p-12 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma conta a receber encontrada. Clique em "Nova Conta a
            Receber" para começar.
          </p>
        </Card>
      ) : (
        <Card className="glass-strong">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
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
              {filteredAR.map((ar) => {
                const saldo = parseFloat(ar.valor_total || 0) - parseFloat(ar.valor_pago || 0);
                const isOverdue = ar.data_vencimento < new Date().toISOString().split("T")[0] && ar.status !== "pago";
                
                return (
                  <TableRow
                    key={ar.id}
                    className={isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {ar.contact?.nome || "N/A"}
                        </div>
                        {ar.contact?.empresa && (
                          <div className="text-xs text-muted-foreground">
                            {ar.contact.empresa}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ar.origem}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(ar.valor_total)}
                    </TableCell>
                    <TableCell className="text-success">
                      {formatCurrency(ar.valor_pago || 0)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(saldo)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(ar.data_vencimento).toLocaleDateString("pt-BR")}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ar.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAR(ar)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        {saldo > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegisterPayment(ar)}
                          >
                            Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ARFormDialog
        open={arDialogOpen}
        onOpenChange={(open) => {
          setArDialogOpen(open);
          if (!open) {
            setEditingAR(null);
          }
        }}
        accountReceivable={editingAR}
        onSuccess={() => {
          loadAccountsReceivable();
          setEditingAR(null);
        }}
      />

      <ARPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        accountReceivable={selectedAR}
        onSuccess={() => {
          loadAccountsReceivable();
          setSelectedAR(null);
        }}
      />
    </div>
  );
}
