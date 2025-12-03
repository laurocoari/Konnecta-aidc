import { useState, useEffect, useMemo } from "react";
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
import { logger } from "@/lib/logger";
import { ARFormDialog } from "@/components/Financeiro/ARFormDialog";
import { ARPaymentDialog } from "@/components/Financeiro/ARPaymentDialog";
import { DeleteARDialog } from "@/components/Financeiro/DeleteARDialog";
import { ExportButton } from "@/components/ExportButton";
import { Edit, FileText, Trash2 } from "lucide-react";
import { SalesOrderDetailDialog } from "@/components/Vendas/SalesOrderDetailDialog";
import { RentalReceiptFromARDialog } from "@/components/Financeiro/RentalReceiptFromARDialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function ContasReceber() {
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [arDialogOpen, setArDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedAR, setSelectedAR] = useState<any>(null);
  const [editingAR, setEditingAR] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSingleDialogOpen, setDeleteSingleDialogOpen] = useState(false);
  const [arToDelete, setArToDelete] = useState<any>(null);

  useEffect(() => {
    loadAccountsReceivable();
  }, [filterStatus]);

  const filteredAR = useMemo(() => {
    return accountsReceivable.filter((ar) => {
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
  }, [accountsReceivable, searchTerm]);

  // Limpar seleção quando os dados filtrados mudarem
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => filteredAR.some((ar) => ar.id === id))
    );
  }, [filteredAR]);

  const loadAccountsReceivable = async () => {
    try {
      setLoading(true);
      logger.db("Carregando contas a receber", { filterStatus });
      
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

      if (error) {
        logger.error("AR", "Erro ao carregar contas a receber", error);
        throw error;
      }

      logger.db(`Contas a receber carregadas: ${data?.length || 0}`);

      // Buscar pedidos relacionados para contas com origem "pedido_venda"
      const pedidoIds = (data || [])
        .filter(ar => ar.origem === "pedido_venda" && ar.referencia_id)
        .map(ar => ar.referencia_id);

      let pedidosMap: Record<string, any> = {};
      let pedidoPropostasMap: Record<string, any> = {};
      
      if (pedidoIds.length > 0) {
        const { data: pedidos } = await supabase
          .from("sales_orders")
          .select("id, numero_pedido, proposta_id")
          .in("id", pedidoIds);
        
        if (pedidos) {
          pedidos.forEach(p => {
            pedidosMap[p.id] = p;
          });

          // Buscar propostas relacionadas aos pedidos
          const propostaIdsFromPedidos = pedidos
            .filter(p => p.proposta_id)
            .map(p => p.proposta_id);
          
          if (propostaIdsFromPedidos.length > 0) {
            const { data: propostasPedidos } = await supabase
              .from("proposals")
              .select("id, codigo, tipo_operacao, condicoes_comerciais")
              .in("id", propostaIdsFromPedidos);
            
            if (propostasPedidos) {
              propostasPedidos.forEach(prop => {
                pedidoPropostasMap[prop.id] = prop;
              });
            }
          }
        }
      }

      // Buscar propostas relacionadas e depois pedidos delas
      const propostaIds = (data || [])
        .filter(ar => ar.origem === "proposta" && ar.referencia_id)
        .map(ar => ar.referencia_id);

      let propostasMap: Record<string, any> = {};
      let propostaPedidosMap: Record<string, any> = {};
      
      if (propostaIds.length > 0) {
        // Buscar propostas
        const { data: propostas } = await supabase
          .from("proposals")
          .select("id, codigo, tipo_operacao, condicoes_comerciais")
          .in("id", propostaIds);
        
        if (propostas) {
          propostas.forEach(p => {
            propostasMap[p.id] = p;
          });

          // Buscar pedidos relacionados às propostas
          const { data: pedidosPropostas } = await supabase
            .from("sales_orders")
            .select("id, numero_pedido, proposta_id")
            .in("proposta_id", propostaIds);
          
          if (pedidosPropostas) {
            pedidosPropostas.forEach(p => {
              propostaPedidosMap[p.proposta_id] = p;
            });
          }
        }
      }

      // Adicionar dados relacionados às contas
      const dataWithRelations = (data || []).map(ar => {
        let pedido = null;
        let proposta = null;
        
        if (ar.origem === "pedido_venda" && ar.referencia_id) {
          pedido = pedidosMap[ar.referencia_id] || null;
          // Se o pedido tem proposta relacionada, incluir nos dados do pedido
          if (pedido && pedido.proposta_id) {
            const propostaRelacionada = pedidoPropostasMap[pedido.proposta_id];
            if (propostaRelacionada) {
              pedido = { ...pedido, proposta: propostaRelacionada };
            }
          }
        } else if (ar.origem === "proposta" && ar.referencia_id) {
          proposta = propostasMap[ar.referencia_id] || null;
          if (proposta) {
            pedido = propostaPedidosMap[ar.referencia_id] || null;
          }
        }
        
        return {
          ...ar,
          pedido,
          proposta,
        };
      });

      // Atualizar status de atrasados
      const hoje = new Date().toISOString().split("T")[0];
      const arsToUpdate = dataWithRelations.filter(
        (ar) =>
          ar.status === "pendente" &&
          ar.data_vencimento < hoje &&
          parseFloat(ar.valor_pago || 0) < parseFloat(ar.valor_total || 0)
      );

      if (arsToUpdate.length > 0) {
        // Atualizar status em lote
        const arsToUpdateIds = arsToUpdate.map(ar => ar.id);
        await supabase
          .from("accounts_receivable")
          .update({ status: "atrasado" })
          .in("id", arsToUpdateIds);
        
        // Atualizar status localmente sem recarregar
        const updatedData = dataWithRelations.map(ar => {
          if (arsToUpdateIds.includes(ar.id)) {
            return { ...ar, status: "atrasado" };
          }
          return ar;
        });
        setAccountsReceivable(updatedData);
      } else {
        setAccountsReceivable(dataWithRelations);
      }
    } catch (error: any) {
      logger.error("AR", "Erro ao carregar contas a receber", error);
      console.error("Error loading AR:", error);
      toast.error("Erro ao carregar contas a receber: " + (error.message || "Erro desconhecido"));
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

  const handleGenerateReceipt = (ar: any) => {
    setSelectedAR(ar);
    setReceiptDialogOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAR.map((ar) => ar.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteClick = (ar: any) => {
    setArToDelete(ar);
    setDeleteSingleDialogOpen(true);
  };

  const handleDeleteSelectedClick = () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos uma conta a receber para deletar");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteReceivables = async (ids: string[]) => {
    if (ids.length === 0) {
      logger.warn("DELETE", "Tentativa de deletar sem IDs selecionados");
      return;
    }

    try {
      setIsDeleting(true);
      logger.info("DELETE", `Iniciando exclusão de ${ids.length} conta(s) a receber`, ids);

      const { error } = await supabase
        .from("accounts_receivable")
        .delete()
        .in("id", ids);

      if (error) {
        logger.error("DELETE", "Erro ao deletar contas a receber", error);
        throw error;
      }

      logger.info("DELETE", `✅ ${ids.length} conta(s) a receber excluída(s) com sucesso`);
      toast.success(`${ids.length} conta(s) a receber deletada(s) com sucesso`);
      setSelectedIds([]);
      await loadAccountsReceivable();
    } catch (error: any) {
      logger.error("DELETE", "Erro ao deletar contas a receber", error);
      console.error("Error deleting AR:", error);
      toast.error("Erro ao deletar contas a receber: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteSelected = () => {
    handleDeleteReceivables(selectedIds);
    setDeleteDialogOpen(false);
  };

  const handleConfirmDeleteSingle = () => {
    if (arToDelete) {
      handleDeleteReceivables([arToDelete.id]);
      setDeleteSingleDialogOpen(false);
      setArToDelete(null);
    }
  };

  const isLocacao = (ar: any) => {
    const tipoOperacao = ar.pedido?.proposta?.tipo_operacao || ar.proposta?.tipo_operacao;
    return tipoOperacao?.includes("locacao");
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

  const formatTipoOperacao = (tipoOperacao: string | undefined) => {
    if (!tipoOperacao) return "-";
    
    const tipos: Record<string, string> = {
      venda_direta: "Venda Direta",
      venda_agenciada: "Venda Agenciada",
      locacao_direta: "Locação Direta",
      locacao_agenciada: "Locação Agenciada",
    };
    
    return tipos[tipoOperacao] || tipoOperacao;
  };

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
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedClick}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionados ({selectedIds.length})
            </Button>
          )}
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredAR.length > 0 &&
                      selectedIds.length === filteredAR.length &&
                      filteredAR.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Tipo de Negociação</TableHead>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(ar.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds((prev) => [...prev, ar.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== ar.id));
                          }
                        }}
                      />
                    </TableCell>
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
                    <TableCell>
                      {ar.pedido ? (
                        <div>
                        <button
                          onClick={() => {
                            setSelectedOrder({ id: ar.pedido.id, numero_pedido: ar.pedido.numero_pedido });
                            setDetailDialogOpen(true);
                          }}
                          className="text-primary hover:underline font-medium"
                        >
                          {ar.pedido.numero_pedido}
                        </button>
                          {/* Mostrar período de contrato se for locação */}
                          {ar.pedido.proposta?.tipo_operacao?.includes('locacao') && ar.pedido.proposta.condicoes_comerciais?.prazo_inicio_contrato && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Contrato: {new Date(ar.pedido.proposta.condicoes_comerciais.prazo_inicio_contrato).toLocaleDateString('pt-BR')} a {ar.pedido.proposta.condicoes_comerciais.prazo_fim_contrato ? new Date(ar.pedido.proposta.condicoes_comerciais.prazo_fim_contrato).toLocaleDateString('pt-BR') : 'N/A'}
                            </div>
                          )}
                        </div>
                      ) : ar.proposta ? (
                        <div className="text-muted-foreground text-sm">
                          <div>{ar.proposta.codigo}</div>
                          {ar.proposta.tipo_operacao?.includes('locacao') && ar.proposta.condicoes_comerciais?.prazo_inicio_contrato && (
                            <div className="text-xs mt-1">
                              Contrato: {new Date(ar.proposta.condicoes_comerciais.prazo_inicio_contrato).toLocaleDateString('pt-BR')} a {ar.proposta.condicoes_comerciais.prazo_fim_contrato ? new Date(ar.proposta.condicoes_comerciais.prazo_fim_contrato).toLocaleDateString('pt-BR') : 'N/A'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatTipoOperacao(
                        ar.pedido?.proposta?.tipo_operacao || ar.proposta?.tipo_operacao
                      )}
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
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAR(ar)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        {isLocacao(ar) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateReceipt(ar)}
                            className="gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Gerar Recibo
                          </Button>
                        )}
                        {saldo > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegisterPayment(ar)}
                          >
                            Registrar Pagamento
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(ar)}
                          title="Excluir Conta a Receber"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <SalesOrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        salesOrder={selectedOrder}
        onSuccess={() => {
          loadAccountsReceivable();
          setSelectedOrder(null);
        }}
      />

      <RentalReceiptFromARDialog
        open={receiptDialogOpen}
        onOpenChange={(open) => {
          setReceiptDialogOpen(open);
          if (!open) {
            setSelectedAR(null);
          }
        }}
        accountReceivable={selectedAR}
        onSuccess={() => {
          loadAccountsReceivable();
          setSelectedAR(null);
        }}
      />

      {/* Modal de confirmação para exclusão em massa */}
      <DeleteARDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteDialogOpen(open);
          }
        }}
        isMultiple={true}
        count={selectedIds.length}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteSelected}
      />

      {/* Modal de confirmação para exclusão individual */}
      <DeleteARDialog
        open={deleteSingleDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteSingleDialogOpen(open);
            if (!open) {
              setArToDelete(null);
            }
          }
        }}
        isMultiple={false}
        clienteNome={arToDelete?.contact?.nome || arToDelete?.contact?.empresa}
        valorTotal={arToDelete ? parseFloat(arToDelete.valor_total || 0) : undefined}
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteSingle}
      />
    </div>
  );
}
