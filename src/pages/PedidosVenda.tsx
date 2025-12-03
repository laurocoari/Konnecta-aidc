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
  ShoppingCart,
  User,
  Package,
  Eye,
  Edit,
  FileText,
  DollarSign,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { SalesOrderFormDialog } from "@/components/Vendas/SalesOrderFormDialog";
import { SalesOrderDetailDialog } from "@/components/Vendas/SalesOrderDetailDialog";
import { DeleteOrderDialog } from "@/components/Vendas/DeleteOrderDialog";
import { ExportButton } from "@/components/ExportButton";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PedidosVenda() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedPedidos, setSelectedPedidos] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteOrderDialogOpen, setDeleteOrderDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);

  useEffect(() => {
    loadSalesOrders();
  }, [filterStatus]);

  const loadSalesOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("sales_orders")
        .select(`
          *,
          cliente:clients(id, nome, cnpj, email),
          vendedor:profiles!sales_orders_vendedor_id_fkey(id, full_name),
          proposta:proposals(id, codigo, versao),
          sales_order_items(count),
          sales_invoices(count)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSalesOrders(data || []);
    } catch (error: any) {
      console.error("Error loading sales orders:", error);
      toast.error("Erro ao carregar pedidos de venda");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setSelectedOrder(null);
    setDialogOpen(true);
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleView = (order: any) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleDeleteClick = (order: any) => {
    setOrderToDelete(order);
    setDeleteOrderDialogOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) {
      logger.warn("DELETE", "Tentativa de deletar pedido sem pedido selecionado");
      toast.error("Nenhum pedido selecionado para exclusão");
      return;
    }

    logger.info("DELETE", `Iniciando exclusão do pedido ${orderToDelete.numero_pedido || orderToDelete.id}`, {
      orderId: orderToDelete.id,
      orderNumber: orderToDelete.numero_pedido,
    });

    try {
      // Verificar se há faturas vinculadas ao pedido
      logger.db(`Verificando faturas vinculadas ao pedido ${orderToDelete.id}`);
      const { data: faturas, error: faturasError } = await supabase
        .from("sales_invoices")
        .select("id, sales_order_id, numero_fatura")
        .eq("sales_order_id", orderToDelete.id);

      if (faturasError) {
        logger.error("DELETE", "Erro ao verificar faturas", faturasError);
        toast.error("Erro ao verificar faturas vinculadas: " + faturasError.message);
        return;
      }

      logger.db(`Faturas encontradas: ${faturas?.length || 0}`, faturas);

      if (faturas && faturas.length > 0) {
        logger.warn("DELETE", `Pedido tem ${faturas.length} fatura(s) vinculada(s)`, faturas);
        
        // Perguntar se deseja deletar as faturas primeiro
        const confirmarDeletarFaturas = window.confirm(
          `Este pedido possui ${faturas.length} fatura(s) vinculada(s):\n\n` +
          faturas.map(f => `- ${f.numero_fatura}`).join('\n') +
          `\n\nDeseja excluir as faturas e depois o pedido?\n\n` +
          `⚠️ ATENÇÃO: Esta ação também excluirá as contas a receber vinculadas às faturas.`
        );

        if (!confirmarDeletarFaturas) {
          logger.info("DELETE", "Exclusão cancelada pelo usuário");
          setOrderToDelete(null);
          setDeleteOrderDialogOpen(false);
          return;
        }

        // Deletar as faturas primeiro
        logger.db(`Deletando ${faturas.length} fatura(s) antes de deletar o pedido`);
        const faturaIds = faturas.map(f => f.id);
        const { error: deleteFaturasError } = await supabase
          .from("sales_invoices")
          .delete()
          .in("id", faturaIds);

        if (deleteFaturasError) {
          logger.error("DELETE", "Erro ao deletar faturas", deleteFaturasError);
          toast.error("Erro ao deletar faturas: " + deleteFaturasError.message);
          setOrderToDelete(null);
          setDeleteOrderDialogOpen(false);
          return;
        }

        logger.info("DELETE", `✅ ${faturas.length} fatura(s) deletada(s) com sucesso`);
        toast.success(`${faturas.length} fatura(s) deletada(s). Deletando pedido...`);
      }

      // Verificar permissões antes de deletar
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error("DELETE", "Usuário não autenticado");
        toast.error("Usuário não autenticado. Faça login novamente.");
        return;
      }
      logger.info("DELETE", `Usuário autenticado: ${user.email} (${user.id})`);

      // Verificar se o pedido ainda existe antes de deletar
      const { data: pedidoExiste, error: checkError } = await supabase
        .from("sales_orders")
        .select("id, numero_pedido")
        .eq("id", orderToDelete.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error("DELETE", "Erro ao verificar pedido", checkError);
        throw checkError;
      }

      if (!pedidoExiste) {
        logger.warn("DELETE", "Pedido não encontrado ou já foi deletado");
        toast.error("O pedido não foi encontrado ou já foi excluído.");
        await loadSalesOrders();
        setOrderToDelete(null);
        setDeleteOrderDialogOpen(false);
        return;
      }

      // Deletar o pedido (os itens serão deletados automaticamente por CASCADE)
      logger.db(`Deletando pedido ${orderToDelete.id} e itens relacionados`);
      const { error: deleteError } = await supabase
        .from("sales_orders")
        .delete()
        .eq("id", orderToDelete.id);

      if (deleteError) {
        logger.error("DELETE", "Erro ao deletar pedido", {
          error: deleteError,
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
        });
        throw deleteError;
      }

      // Verificar se foi deletado com sucesso
      const { data: pedidoAindaExiste, error: verifyError } = await supabase
        .from("sales_orders")
        .select("id")
        .eq("id", orderToDelete.id)
        .maybeSingle();

      if (verifyError && verifyError.code !== 'PGRST116') {
        logger.warn("DELETE", "Erro ao verificar exclusão", verifyError);
      }

      if (!pedidoAindaExiste) {
        logger.info("DELETE", `✅ Pedido ${orderToDelete.numero_pedido || orderToDelete.id} excluído com sucesso`);
        toast.success("Pedido excluído com sucesso");
        await loadSalesOrders();
        setOrderToDelete(null);
      } else {
        logger.warn("DELETE", `⚠️ O pedido ainda existe após tentativa de exclusão. Verifique permissões RLS.`);
        toast.error("Não foi possível excluir o pedido. Verifique suas permissões ou se há dependências.");
      }
    } catch (error: any) {
      logger.error("DELETE", "Erro ao excluir pedido", error);
      
      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao excluir pedido";
      if (error.code === '23503') {
        errorMessage = "Não é possível excluir o pedido. Existem registros vinculados (faturas, itens, etc.).";
      } else if (error.code === '42501') {
        errorMessage = "Você não tem permissão para excluir este pedido.";
      } else if (error.message) {
        errorMessage = `Erro ao excluir pedido: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setDeleteOrderDialogOpen(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPedidos(filteredOrders.map(order => order.id));
    } else {
      setSelectedPedidos([]);
    }
  };

  const handleToggleSelect = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedPedidos([...selectedPedidos, orderId]);
    } else {
      setSelectedPedidos(selectedPedidos.filter(id => id !== orderId));
    }
  };

  const handleBulkDelete = () => {
    if (selectedPedidos.length === 0) {
      toast.error("Nenhum pedido selecionado");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedPedidos.length === 0) {
      logger.warn("DELETE", "Tentativa de deletar sem pedidos selecionados");
      toast.error("Nenhum pedido selecionado");
      setDeleteDialogOpen(false);
      return;
    }

    logger.info("DELETE", `Iniciando exclusão em massa de ${selectedPedidos.length} pedido(s)`, selectedPedidos);

    try {
      // Verificar se há faturas vinculadas aos pedidos
      logger.db(`Verificando faturas vinculadas aos pedidos selecionados`);
      const { data: faturas, error: faturasError } = await supabase
        .from("sales_invoices")
        .select("id, sales_order_id, numero_fatura")
        .in("sales_order_id", selectedPedidos);

      if (faturasError) {
        logger.error("DELETE", "Erro ao verificar faturas", faturasError);
        toast.error("Erro ao verificar faturas vinculadas: " + faturasError.message);
        setDeleteDialogOpen(false);
        return;
      }

      logger.db(`Faturas encontradas: ${faturas?.length || 0}`, faturas);

      if (faturas && faturas.length > 0) {
        const pedidosComFaturas = new Set(faturas.map(f => f.sales_order_id));
        const pedidosSemFaturas = selectedPedidos.filter(id => !pedidosComFaturas.has(id));

        // Se todos têm faturas, perguntar se deseja deletar as faturas primeiro
        if (pedidosSemFaturas.length === 0) {
          logger.warn("DELETE", `Todos os ${selectedPedidos.length} pedidos têm faturas vinculadas`, {
            pedidosComFaturas: Array.from(pedidosComFaturas),
            faturas,
          });
          
          const confirmarDeletarFaturas = window.confirm(
            `Todos os ${selectedPedidos.length} pedido(s) selecionado(s) possuem faturas vinculadas:\n\n` +
            faturas.map(f => `- ${f.numero_fatura} (Pedido: ${f.sales_order_id.slice(0, 8)}...)`).join('\n') +
            `\n\nDeseja excluir as faturas e depois os pedidos?\n\n` +
            `⚠️ ATENÇÃO: Esta ação também excluirá as contas a receber vinculadas às faturas.`
          );

          if (!confirmarDeletarFaturas) {
            logger.info("DELETE", "Exclusão em massa cancelada pelo usuário");
            setDeleteDialogOpen(false);
            return;
          }

          // Deletar todas as faturas primeiro
          logger.db(`Deletando ${faturas.length} fatura(s) antes de deletar os pedidos`);
          const faturaIds = faturas.map(f => f.id);
          const { error: deleteFaturasError } = await supabase
            .from("sales_invoices")
            .delete()
            .in("id", faturaIds);

          if (deleteFaturasError) {
            logger.error("DELETE", "Erro ao deletar faturas", deleteFaturasError);
            toast.error("Erro ao deletar faturas: " + deleteFaturasError.message);
            setDeleteDialogOpen(false);
            return;
          }

          logger.info("DELETE", `✅ ${faturas.length} fatura(s) deletada(s) com sucesso`);
          toast.success(`${faturas.length} fatura(s) deletada(s). Deletando pedidos...`);

          // Agora deletar todos os pedidos
          logger.db(`Deletando ${selectedPedidos.length} pedido(s) após deletar faturas`);
          const { error: deleteError } = await supabase
            .from("sales_orders")
            .delete()
            .in("id", selectedPedidos);

          if (deleteError) {
            logger.error("DELETE", "Erro ao deletar pedidos", deleteError);
            throw deleteError;
          }

          // Verificar se foram deletados
          const { data: pedidosAindaExistem } = await supabase
            .from("sales_orders")
            .select("id")
            .in("id", selectedPedidos);

          const deletados = selectedPedidos.length - (pedidosAindaExistem?.length || 0);

          if (deletados > 0) {
            logger.info("DELETE", `✅ ${deletados} pedido(s) excluído(s) com sucesso`);
            toast.success(`${deletados} pedido(s) excluído(s) com sucesso`);
            setSelectedPedidos([]);
            await loadSalesOrders();
          } else {
            logger.warn("DELETE", `⚠️ Nenhum pedido foi deletado. Verifique permissões RLS.`);
            toast.error("Não foi possível excluir os pedidos. Verifique suas permissões.");
          }
          setDeleteDialogOpen(false);
          return;
        }

        // Alguns têm faturas, outros não
        const confirmar = window.confirm(
          `${pedidosComFaturas.size} pedido(s) têm faturas vinculadas e ${pedidosSemFaturas.length} pedido(s) não têm.\n\n` +
          `Opções:\n` +
          `1. Deletar apenas os ${pedidosSemFaturas.length} pedido(s) sem faturas\n` +
          `2. Deletar as faturas e depois todos os pedidos\n\n` +
          `Escolha "OK" para deletar faturas + todos os pedidos, ou "Cancelar" para deletar apenas os sem faturas.`
        );

        if (confirmar) {
          // Deletar faturas primeiro, depois todos os pedidos
          logger.db(`Deletando ${faturas.length} fatura(s) antes de deletar todos os pedidos`);
          const faturaIds = faturas.map(f => f.id);
          const { error: deleteFaturasError } = await supabase
            .from("sales_invoices")
            .delete()
            .in("id", faturaIds);

          if (deleteFaturasError) {
            logger.error("DELETE", "Erro ao deletar faturas", deleteFaturasError);
            toast.error("Erro ao deletar faturas: " + deleteFaturasError.message);
            setDeleteDialogOpen(false);
            return;
          }

          logger.info("DELETE", `✅ ${faturas.length} fatura(s) deletada(s) com sucesso`);
          toast.success(`${faturas.length} fatura(s) deletada(s). Deletando pedidos...`);

          // Deletar todos os pedidos
          logger.db(`Deletando ${selectedPedidos.length} pedido(s) após deletar faturas`);
          const { error: deleteError } = await supabase
            .from("sales_orders")
            .delete()
            .in("id", selectedPedidos);

          if (deleteError) {
            logger.error("DELETE", "Erro ao deletar pedidos", deleteError);
            throw deleteError;
          }

          // Verificar se foram deletados
          const { data: pedidosAindaExistem } = await supabase
            .from("sales_orders")
            .select("id")
            .in("id", selectedPedidos);

          const deletados = selectedPedidos.length - (pedidosAindaExistem?.length || 0);

          if (deletados > 0) {
            logger.info("DELETE", `✅ ${deletados} pedido(s) excluído(s) com sucesso`);
            toast.success(`${deletados} pedido(s) excluído(s) com sucesso`);
            setSelectedPedidos([]);
            await loadSalesOrders();
          } else {
            logger.warn("DELETE", `⚠️ Nenhum pedido foi deletado. Verifique permissões RLS.`);
            toast.error("Não foi possível excluir os pedidos. Verifique suas permissões.");
          }
          setDeleteDialogOpen(false);
          return;
        } else {
          // Deletar apenas os sem faturas
          logger.db(`Deletando apenas ${pedidosSemFaturas.length} pedido(s) sem faturas`);
          const { error: deleteError } = await supabase
            .from("sales_orders")
            .delete()
            .in("id", pedidosSemFaturas);

          if (deleteError) {
            logger.error("DELETE", "Erro ao deletar pedidos", deleteError);
            throw deleteError;
          }

          // Verificar se foram deletados
          const { data: pedidosAindaExistem } = await supabase
            .from("sales_orders")
            .select("id")
            .in("id", pedidosSemFaturas);

          const deletados = pedidosSemFaturas.length - (pedidosAindaExistem?.length || 0);

          if (deletados > 0) {
            logger.info("DELETE", `✅ ${deletados} pedido(s) excluído(s) com sucesso`);
            toast.success(`${deletados} pedido(s) excluído(s) com sucesso`);
            setSelectedPedidos([]);
            await loadSalesOrders();
          } else {
            logger.warn("DELETE", `⚠️ Nenhum pedido foi deletado. Verifique permissões RLS.`);
            toast.error("Não foi possível excluir os pedidos. Verifique suas permissões.");
          }
          setDeleteDialogOpen(false);
          return;
        }
      } else {
        // Nenhuma fatura vinculada, pode deletar todos
        logger.db(`Deletando ${selectedPedidos.length} pedido(s) e itens relacionados`);
        const { error: deleteError } = await supabase
          .from("sales_orders")
          .delete()
          .in("id", selectedPedidos);

        if (deleteError) {
          logger.error("DELETE", "Erro ao deletar pedidos", deleteError);
          throw deleteError;
        }

        // Verificar se foram deletados
        const { data: pedidosAindaExistem } = await supabase
          .from("sales_orders")
          .select("id")
          .in("id", selectedPedidos);

        const deletados = selectedPedidos.length - (pedidosAindaExistem?.length || 0);

        if (deletados > 0) {
          logger.info("DELETE", `✅ ${deletados} pedido(s) excluído(s) com sucesso`);
          toast.success(`${deletados} pedido(s) excluído(s) com sucesso`);
          setSelectedPedidos([]);
          await loadSalesOrders();
        } else {
          logger.warn("DELETE", `⚠️ Nenhum pedido foi deletado. Verifique permissões RLS.`);
          toast.error("Não foi possível excluir os pedidos. Verifique suas permissões.");
        }
      }
    } catch (error: any) {
      logger.error("DELETE", "Erro ao excluir pedidos em massa", error);
      
      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao excluir pedidos";
      if (error.code === '23503') {
        errorMessage = "Não é possível excluir os pedidos. Existem registros vinculados (faturas, itens, etc.).";
      } else if (error.code === '42501') {
        errorMessage = "Você não tem permissão para excluir estes pedidos.";
      } else if (error.message) {
        errorMessage = `Erro ao excluir pedidos: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: any }> = {
      rascunho: { label: "Rascunho", variant: "secondary" },
      em_aprovacao: { label: "Em Aprovação", variant: "outline" },
      aprovado: { label: "Aprovado", variant: "default" },
      faturado: { label: "Faturado", variant: "success" },
      finalizado: { label: "Finalizado", variant: "success" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };
    const config = configs[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const filteredOrders = salesOrders.filter((order) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        order.numero_pedido?.toLowerCase().includes(term) ||
        order.cliente?.nome?.toLowerCase().includes(term) ||
        order.cliente?.cnpj?.toLowerCase().includes(term) ||
        order.proposta?.codigo?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos de Venda</h1>
          <p className="text-muted-foreground">
            Gerencie pedidos de venda e faturamento
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename="pedidos-venda"
            title="Pedidos de Venda"
            columns={[
              { header: "Número", key: "numero", width: 15 },
              { header: "Cliente", key: "cliente", width: 30 },
              { header: "CNPJ", key: "cnpj", width: 18 },
              { header: "Vendedor", key: "vendedor", width: 25 },
              { header: "Data Pedido", key: "data_pedido", width: 15 },
              { header: "Status", key: "status", width: 15 },
              { header: "Total", key: "total", width: 18 },
            ]}
            data={filteredOrders.map((order) => ({
              numero: order.numero_pedido || `#${order.id.slice(0, 8)}`,
              cliente: order.cliente?.nome || "N/A",
              cnpj: order.cliente?.cnpj || "-",
              vendedor: order.vendedor?.full_name || "N/A",
              data_pedido: order.data_pedido
                ? new Date(order.data_pedido).toLocaleDateString("pt-BR")
                : "-",
              status: order.status === "rascunho" ? "Rascunho" :
                      order.status === "em_aprovacao" ? "Em Aprovação" :
                      order.status === "aprovado" ? "Aprovado" :
                      order.status === "faturado" ? "Faturado" :
                      order.status === "finalizado" ? "Finalizado" :
                      order.status === "cancelado" ? "Cancelado" : order.status,
              total: order.total_geral || 0,
            }))}
          />
          {selectedPedidos.length > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionados ({selectedPedidos.length})
            </Button>
          )}
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="glass-strong p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou proposta..."
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
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="faturado">Faturado</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando pedidos...
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="glass-strong p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum pedido de venda encontrado. Clique em "Novo Pedido" para
            começar.
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
                      filteredOrders.length > 0 &&
                      selectedPedidos.length === filteredOrders.length &&
                      filteredOrders.every(order => selectedPedidos.includes(order.id))
                    }
                    onCheckedChange={handleToggleSelectAll}
                  />
                </TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Proposta</TableHead>
                <TableHead>Data Pedido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow 
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleView(order)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPedidos.includes(order.id)}
                      onCheckedChange={(checked) =>
                        handleToggleSelect(order.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {order.numero_pedido || `#${order.id.slice(0, 8)}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {order.cliente?.nome || "N/A"}
                        </div>
                        {order.cliente?.cnpj && (
                          <div className="text-xs text-muted-foreground">
                            {order.cliente.cnpj}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.vendedor?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {order.proposta ? (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        {order.proposta.codigo} v{order.proposta.versao}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.data_pedido
                      ? new Date(order.data_pedido).toLocaleDateString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <div className="flex items-center justify-end gap-1 text-success">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(order.total_geral || 0)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(order)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status !== "cancelado" && order.status !== "finalizado" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(order)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(order)}
                        title="Excluir Pedido"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SalesOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        salesOrder={selectedOrder}
        onSuccess={() => {
          loadSalesOrders();
          setSelectedOrder(null);
        }}
      />

      <SalesOrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        salesOrder={selectedOrder}
        onSuccess={loadSalesOrders}
      />

      {/* Modal de confirmação de exclusão em massa */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir os {selectedPedidos.length} pedido(s) selecionado(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação de exclusão individual */}
      <DeleteOrderDialog
        open={deleteOrderDialogOpen}
        onOpenChange={(open) => {
          setDeleteOrderDialogOpen(open);
          if (!open) {
            setOrderToDelete(null);
          }
        }}
        orderNumber={orderToDelete?.numero_pedido || `#${orderToDelete?.id?.slice(0, 8) || ""}`}
        onConfirm={handleDeleteOrder}
      />
    </div>
  );
}

