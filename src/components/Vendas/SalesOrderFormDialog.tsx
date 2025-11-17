import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

interface SalesOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder?: any;
  proposta?: any; // Para criar a partir de proposta
  onSuccess: () => void;
}

interface SalesOrderItem {
  id?: string;
  product_id?: string;
  descricao: string;
  codigo_produto?: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  total: number;
}

export function SalesOrderFormDialog({
  open,
  onOpenChange,
  salesOrder,
  proposta,
  onSuccess,
}: SalesOrderFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [searchProduto, setSearchProduto] = useState("");
  const [formData, setFormData] = useState({
    cliente_id: "",
    proposta_id: proposta?.id || "",
    vendedor_id: user?.id || "",
    data_pedido: new Date().toISOString().split("T")[0],
    data_entrega_prevista: "",
    tipo_pagamento: "avista",
    observacoes: "",
    status: "rascunho",
  });
  const [items, setItems] = useState<SalesOrderItem[]>([]);

  useEffect(() => {
    if (open) {
      loadClientes();
      loadProdutos();
      loadVendedores();
      
      if (salesOrder) {
        // Carregar dados do pedido existente
        setFormData({
          cliente_id: salesOrder.cliente_id || "",
          proposta_id: salesOrder.proposta_id || "",
          vendedor_id: salesOrder.vendedor_id || user?.id || "",
          data_pedido: salesOrder.data_pedido || new Date().toISOString().split("T")[0],
          data_entrega_prevista: salesOrder.data_entrega_prevista || "",
          tipo_pagamento: salesOrder.tipo_pagamento || "avista",
          observacoes: salesOrder.observacoes || "",
          status: salesOrder.status || "rascunho",
        });
        loadOrderItems();
      } else if (proposta) {
        // Pré-preencher a partir de proposta
        setFormData({
          cliente_id: proposta.cliente_id || "",
          proposta_id: proposta.id || "",
          vendedor_id: proposta.vendedor_id || user?.id || "",
          data_pedido: new Date().toISOString().split("T")[0],
          data_entrega_prevista: "",
          tipo_pagamento: "avista",
          observacoes: `Pedido criado a partir da proposta ${proposta.codigo}`,
          status: "aprovado",
        });
        loadProposalItems();
      } else {
        // Novo pedido vazio
        setFormData({
          cliente_id: "",
          proposta_id: "",
          vendedor_id: user?.id || "",
          data_pedido: new Date().toISOString().split("T")[0],
          data_entrega_prevista: "",
          tipo_pagamento: "avista",
          observacoes: "",
          status: "rascunho",
        });
        setItems([]);
      }
    }
  }, [open, salesOrder, proposta, user]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, nome, cnpj, email")
        .order("nome");

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar clientes", error);
      toast.error("Erro ao carregar clientes");
    }
  };

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, codigo, sku_interno, valor_venda")
        .eq("status", "ativo")
        .order("nome");

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar produtos", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const loadVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "comercial"])
        .order("full_name");

      if (error) throw error;
      setVendedores(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar vendedores", error);
    }
  };

  const loadOrderItems = async () => {
    if (!salesOrder?.id) return;
    try {
      const { data, error } = await supabase
        .from("sales_order_items")
        .select(`
          *,
          product:products(id, nome, codigo, sku_interno)
        `)
        .eq("sales_order_id", salesOrder.id);

      if (error) throw error;
      
      const formattedItems = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        descricao: item.descricao,
        codigo_produto: item.codigo_produto,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto_percentual: item.desconto_percentual || 0,
        total: item.total,
      }));
      
      setItems(formattedItems);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar itens do pedido", error);
      toast.error("Erro ao carregar itens do pedido");
    }
  };

  const loadProposalItems = async () => {
    if (!proposta?.id) return;
    try {
      const { data, error } = await supabase
        .from("proposal_items")
        .select(`
          *,
          product:products(id, nome, codigo, sku_interno)
        `)
        .eq("proposal_id", proposta.id);

      if (error) throw error;
      
      const formattedItems = (data || []).map((item: any) => ({
        product_id: item.product_id,
        descricao: item.descricao,
        codigo_produto: item.codigo || item.product?.codigo || "",
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario || item.valor_unitario || 0,
        desconto_percentual: item.desconto || 0,
        total: item.total,
      }));
      
      setItems(formattedItems);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar itens da proposta", error);
      toast.error("Erro ao carregar itens da proposta");
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `temp-${Date.now()}`,
        product_id: "",
        descricao: "",
        codigo_produto: "",
        quantidade: 1,
        preco_unitario: 0,
        desconto_percentual: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Se mudou o produto, atualizar descrição e código
    if (field === "product_id" && value) {
      const produto = produtos.find((p) => p.id === value);
      if (produto) {
        item.descricao = produto.nome;
        item.codigo_produto = produto.sku_interno || produto.codigo || "";
        item.preco_unitario = produto.valor_venda || 0;
      }
    }
    
    // Recalcular total do item
    const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
    const desconto = subtotal * ((item.desconto_percentual || 0) / 100);
    item.total = subtotal - desconto;
    
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      return total + (item.total || 0);
    }, 0);
  };

  const calculateDescontoTotal = () => {
    return items.reduce((total, item) => {
      const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
      const desconto = subtotal * ((item.desconto_percentual || 0) / 100);
      return total + desconto;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast.error("Selecione um cliente");
      return;
    }
    
    if (!formData.vendedor_id) {
      toast.error("Selecione um vendedor");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    // Validar itens
    const invalidItems = items.filter(
      (item) => !item.product_id || !item.descricao || item.quantidade <= 0
    );
    if (invalidItems.length > 0) {
      toast.error("Preencha todos os campos dos itens");
      return;
    }

    setLoading(true);

    try {
      const orderData: any = {
        cliente_id: formData.cliente_id,
        vendedor_id: formData.vendedor_id,
        data_pedido: formData.data_pedido,
        data_entrega_prevista: formData.data_entrega_prevista || null,
        tipo_pagamento: formData.tipo_pagamento,
        observacoes: formData.observacoes,
        status: formData.status,
        created_by: user?.id,
        updated_by: user?.id,
      };

      // Adicionar proposta_id se houver
      if (formData.proposta_id) {
        orderData.proposta_id = formData.proposta_id;
      }

      let orderId: string;

      if (salesOrder) {
        // Atualizar pedido existente
        const { data, error } = await supabase
          .from("sales_orders")
          .update({
            ...orderData,
            updated_by: user?.id,
          })
          .eq("id", salesOrder.id)
          .select()
          .single();

        if (error) throw error;
        orderId = salesOrder.id;

        // Deletar itens antigos
        await supabase
          .from("sales_order_items")
          .delete()
          .eq("sales_order_id", orderId);
      } else {
        // Criar novo pedido
        // O número do pedido será gerado automaticamente pelo trigger
        const { data, error } = await supabase
          .from("sales_orders")
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;
        orderId = data.id;
      }

      // Inserir itens
      const itemsToInsert = items.map((item) => ({
        sales_order_id: orderId,
        product_id: item.product_id || null,
        descricao: item.descricao,
        codigo_produto: item.codigo_produto || null,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto_percentual: item.desconto_percentual || 0,
        total: item.total,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("sales_order_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // O total será recalculado automaticamente pelo trigger
      toast.success(
        salesOrder
          ? "Pedido atualizado com sucesso!"
          : "Pedido criado com sucesso!"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      logger.error("DB", "Erro ao salvar pedido", error);
      toast.error(error.message || "Erro ao salvar pedido");
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = produtos.filter((p) =>
    searchProduto
      ? p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(searchProduto.toLowerCase()) ||
        p.sku_interno?.toLowerCase().includes(searchProduto.toLowerCase())
      : true
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {salesOrder ? "Editar Pedido de Venda" : "Novo Pedido de Venda"}
          </DialogTitle>
          <DialogDescription>
            {salesOrder
              ? "Atualize as informações do pedido"
              : proposta
              ? "Criar pedido a partir da proposta aprovada"
              : "Crie um novo pedido de venda"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, cliente_id: value })
                }
                required
                disabled={!!proposta}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.cnpj ? `- ${c.cnpj}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendedor_id">Vendedor *</Label>
              <Select
                value={formData.vendedor_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, vendedor_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_pedido">Data do Pedido</Label>
              <Input
                id="data_pedido"
                type="date"
                value={formData.data_pedido}
                onChange={(e) =>
                  setFormData({ ...formData, data_pedido: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_entrega_prevista">Data Entrega Prevista</Label>
              <Input
                id="data_entrega_prevista"
                type="date"
                value={formData.data_entrega_prevista}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    data_entrega_prevista: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_pagamento">Tipo de Pagamento</Label>
              <Select
                value={formData.tipo_pagamento}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_pagamento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avista">À Vista</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do Pedido</Label>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="pl-8 w-48"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Desconto %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) =>
                              updateItem(index, "product_id", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {produtosFiltrados.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome} ({p.sku_interno || p.codigo})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.codigo_produto || ""}
                            onChange={(e) =>
                              updateItem(index, "codigo_produto", e.target.value)
                            }
                            placeholder="Código"
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade || ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantidade",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.preco_unitario || ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "preco_unitario",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.desconto_percentual || ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "desconto_percentual",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(item.total || 0)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(calculateSubtotal())}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Desconto Total</div>
                <div className="text-lg font-semibold text-red-600">
                  - {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(calculateDescontoTotal())}
                </div>
              </div>
              <div className="text-right space-y-1 border-t pt-1">
                <div className="text-sm text-muted-foreground">Total Geral</div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(calculateTotal())}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Salvando..."
                : salesOrder
                ? "Atualizar"
                : "Criar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



