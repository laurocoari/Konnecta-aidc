import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  X,
  DollarSign,
  Printer,
  FileText,
  User,
  Calendar,
  Package,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";
import { SalesOrderLogsTimeline } from "./SalesOrderLogsTimeline";
import { SalesOrderFormDialog } from "./SalesOrderFormDialog";
import { SalesOrderInvoiceDialog } from "./SalesOrderInvoiceDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalesOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: any;
  onSuccess: () => void;
}

export function SalesOrderDetailDialog({
  open,
  onOpenChange,
  salesOrder,
  onSuccess,
}: SalesOrderDetailDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  useEffect(() => {
    if (open && salesOrder?.id) {
      loadOrderDetails();
    }
  }, [open, salesOrder]);

  const loadOrderDetails = async () => {
    if (!salesOrder?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales_orders")
        .select(`
          *,
          cliente:clients(id, nome, cnpj, email, telefone, cidade, estado),
          vendedor:profiles!sales_orders_vendedor_id_fkey(id, full_name),
          proposta:proposals(id, codigo, versao),
          sales_order_items(
            *,
            product:products(id, nome, codigo, sku_interno)
          ),
          sales_invoices(count)
        `)
        .eq("id", salesOrder.id)
        .single();

      if (error) throw error;
      setOrderData(data);
      setItems(data.sales_order_items || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar detalhes do pedido", error);
      toast.error("Erro ao carregar detalhes do pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!orderData) return;

    if (
      !confirm(
        `Tem certeza que deseja cancelar o pedido ${orderData.numero_pedido}?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("sales_orders")
        .update({
          status: "cancelado",
          updated_by: user?.id,
        })
        .eq("id", orderData.id);

      if (error) throw error;

      toast.success("Pedido cancelado com sucesso");
      onSuccess();
      loadOrderDetails();
    } catch (error: any) {
      logger.error("DB", "Erro ao cancelar pedido", error);
      toast.error("Erro ao cancelar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!orderData && !loading) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">
                  Pedido {orderData?.numero_pedido || salesOrder?.numero_pedido}
                </DialogTitle>
                <DialogDescription>
                  Detalhes completos do pedido de venda
                </DialogDescription>
              </div>
              {orderData && getStatusBadge(orderData.status)}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando detalhes...
            </div>
          ) : (
            <Tabs defaultValue="detalhes" className="w-full">
              <TabsList>
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="itens">Itens</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cliente
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>{" "}
                        <span className="font-medium">
                          {orderData?.cliente?.nome || "N/A"}
                        </span>
                      </div>
                      {orderData?.cliente?.cnpj && (
                        <div>
                          <span className="text-muted-foreground">CNPJ:</span>{" "}
                          <span className="font-medium">
                            {orderData.cliente.cnpj}
                          </span>
                        </div>
                      )}
                      {orderData?.cliente?.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span className="font-medium">
                            {orderData.cliente.email}
                          </span>
                        </div>
                      )}
                      {orderData?.cliente?.telefone && (
                        <div>
                          <span className="text-muted-foreground">Telefone:</span>{" "}
                          <span className="font-medium">
                            {orderData.cliente.telefone}
                          </span>
                        </div>
                      )}
                      {orderData?.cliente?.cidade && (
                        <div>
                          <span className="text-muted-foreground">Cidade:</span>{" "}
                          <span className="font-medium">
                            {orderData.cliente.cidade}
                            {orderData.cliente.estado && `, ${orderData.cliente.estado}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Informações do Pedido
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Vendedor:</span>{" "}
                        <span className="font-medium">
                          {orderData?.vendedor?.full_name || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data do Pedido:</span>{" "}
                        <span className="font-medium">
                          {orderData?.data_pedido
                            ? format(
                                new Date(orderData.data_pedido),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )
                            : "N/A"}
                        </span>
                      </div>
                      {orderData?.data_entrega_prevista && (
                        <div>
                          <span className="text-muted-foreground">
                            Entrega Prevista:
                          </span>{" "}
                          <span className="font-medium">
                            {format(
                              new Date(orderData.data_entrega_prevista),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      )}
                      {orderData?.data_entrega_real && (
                        <div>
                          <span className="text-muted-foreground">
                            Entrega Real:
                          </span>{" "}
                          <span className="font-medium">
                            {format(
                              new Date(orderData.data_entrega_real),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">
                          Tipo de Pagamento:
                        </span>{" "}
                        <span className="font-medium">
                          {orderData?.tipo_pagamento === "avista"
                            ? "À Vista"
                            : orderData?.tipo_pagamento === "parcelado"
                            ? "Parcelado"
                            : orderData?.tipo_pagamento === "boleto"
                            ? "Boleto"
                            : orderData?.tipo_pagamento === "cartao"
                            ? "Cartão"
                            : orderData?.tipo_pagamento === "transferencia"
                            ? "Transferência"
                            : orderData?.tipo_pagamento || "N/A"}
                        </span>
                      </div>
                      {orderData?.proposta && (
                        <div>
                          <span className="text-muted-foreground">Proposta:</span>{" "}
                          <Button
                            variant="link"
                            className="h-auto p-0 font-medium"
                            onClick={() => {
                              navigate(`/propostas?proposta=${orderData.proposta.id}`);
                              onOpenChange(false);
                            }}
                          >
                            {orderData.proposta.codigo} v{orderData.proposta.versao}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {orderData?.observacoes && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Observações</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {orderData.observacoes}
                    </p>
                  </Card>
                )}

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumo Financeiro
                  </h3>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Subtotal</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(orderData?.subtotal || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Desconto Total
                      </div>
                      <div className="text-lg font-semibold text-red-600">
                        - {formatCurrency(orderData?.desconto_total || 0)}
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="text-sm text-muted-foreground">Total Geral</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(orderData?.total_geral || 0)}
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="itens">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Desconto %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum item encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.descricao}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.codigo_produto || item.product?.codigo || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantidade}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.preco_unitario)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.desconto_percentual || 0}%
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="historico">
                {orderData?.id && (
                  <SalesOrderLogsTimeline salesOrderId={orderData.id} />
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {orderData?.status !== "cancelado" &&
                orderData?.status !== "finalizado" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    {orderData?.status !== "faturado" && (
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    )}
                    {orderData?.status === "aprovado" && (
                      <Button
                        variant="default"
                        onClick={() => setInvoiceDialogOpen(true)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Gerar Fatura
                      </Button>
                    )}
                  </>
                )}
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {orderData && (
        <>
          <SalesOrderFormDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            salesOrder={orderData}
            onSuccess={() => {
              loadOrderDetails();
              onSuccess();
            }}
          />
          <SalesOrderInvoiceDialog
            open={invoiceDialogOpen}
            onOpenChange={setInvoiceDialogOpen}
            salesOrder={orderData}
            onSuccess={() => {
              loadOrderDetails();
              onSuccess();
            }}
          />
        </>
      )}
    </>
  );
}

