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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SalesOrderFormDialog } from "@/components/Vendas/SalesOrderFormDialog";
import { SalesOrderDetailDialog } from "@/components/Vendas/SalesOrderDetailDialog";
import { ExportButton } from "@/components/ExportButton";
import { useNavigate } from "react-router-dom";

export default function PedidosVenda() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
    </div>
  );
}

