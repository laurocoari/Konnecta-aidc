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
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: any;
  onSuccess: () => void;
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSuccess,
}: PurchaseOrderFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_entrega_prevista: "",
    status: "rascunho",
    observacoes: "",
  });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadSuppliers();
      loadProducts();
      if (purchaseOrder) {
        setFormData({
          supplier_id: purchaseOrder.supplier_id || "",
          data_emissao: purchaseOrder.data_emissao || new Date().toISOString().split("T")[0],
          data_entrega_prevista: purchaseOrder.data_entrega_prevista || "",
          status: purchaseOrder.status || "rascunho",
          observacoes: purchaseOrder.observacoes || "",
        });
        loadOrderItems();
      } else {
        setFormData({
          supplier_id: "",
          data_emissao: new Date().toISOString().split("T")[0],
          data_entrega_prevista: "",
          status: "rascunho",
          observacoes: "",
        });
        setItems([]);
      }
    }
  }, [open, purchaseOrder]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, nome, cnpj")
        .eq("status", "ativo")
        .order("nome");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Error loading suppliers:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, codigo, sku_interno")
        .eq("status", "ativo")
        .order("nome");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
    }
  };

  // Função para carregar código do fornecedor para um produto
  const loadSupplierCodeForProduct = async (productId: string, supplierId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("product_supplier_codes")
        .select("codigo_fornecedor")
        .eq("product_id", productId)
        .eq("supplier_id", supplierId)
        .eq("codigo_principal", true)
        .maybeSingle();

      // Se erro 404 ou tabela não existe, retornar null silenciosamente
      if (error) {
        if (error.code === "PGRST116" || error.status === 404) {
          return null;
        }
        // Outros erros: logar apenas em desenvolvimento
        if (import.meta.env.DEV) {
          console.warn("Erro ao carregar código de fornecedor:", error);
        }
        return null;
      }
      return data?.codigo_fornecedor || null;
    } catch (error: any) {
      // Não logar erros esperados (404, tabela não existe)
      if (error?.code !== "PGRST116" && error?.status !== 404) {
        if (import.meta.env.DEV) {
          console.warn("Erro ao carregar código de fornecedor:", error);
        }
      }
      return null;
    }
  };

  const loadOrderItems = async () => {
    if (!purchaseOrder?.id) return;
    try {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          product:products(id, nome, codigo, sku_interno)
        `)
        .eq("purchase_order_id", purchaseOrder.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error loading order items:", error);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `temp-${Date.now()}`,
        product_id: "",
        quantidade: 1,
        preco_unitario: 0,
        desconto_percentual: 0,
        codigo_fornecedor: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const subtotal = (item.quantidade || 0) * (item.preco_unitario || 0);
      const desconto = subtotal * ((item.desconto_percentual || 0) / 100);
      return total + subtotal - desconto;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        ...formData,
        created_by: user?.id,
        total_geral: calculateTotal(),
      };

      let orderId: string;

      if (purchaseOrder) {
        const { data, error } = await supabase
          .from("purchase_orders")
          .update(orderData)
          .eq("id", purchaseOrder.id)
          .select()
          .single();

        if (error) throw error;
        orderId = purchaseOrder.id;

        // Deletar itens antigos
        await supabase
          .from("purchase_order_items")
          .delete()
          .eq("purchase_order_id", orderId);
      } else {
        const { data, error } = await supabase
          .from("purchase_orders")
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;
        orderId = data.id;
      }

      // Inserir itens
      const itemsToInsert = items
        .filter((item) => item.product_id)
        .map((item) => ({
          purchase_order_id: orderId,
          product_id: item.product_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_percentual: item.desconto_percentual || 0,
          codigo_fornecedor: item.codigo_fornecedor || null,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success(
        purchaseOrder
          ? "Pedido atualizado com sucesso!"
          : "Pedido criado com sucesso!"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving purchase order:", error);
      toast.error(error.message || "Erro ao salvar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {purchaseOrder ? "Editar Pedido de Compra" : "Novo Pedido de Compra"}
          </DialogTitle>
          <DialogDescription>
            {purchaseOrder
              ? "Atualize as informações do pedido"
              : "Crie um novo pedido de compra para um fornecedor"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Fornecedor *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, supplier_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_emissao">Data de Emissão</Label>
              <Input
                id="data_emissao"
                type="date"
                value={formData.data_emissao}
                onChange={(e) =>
                  setFormData({ ...formData, data_emissao: e.target.value })
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
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
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
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Código Fornecedor</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Desconto %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const subtotal =
                        (item.quantidade || 0) * (item.preco_unitario || 0);
                      const desconto =
                        subtotal * ((item.desconto_percentual || 0) / 100);
                      const total = subtotal - desconto;

                      return (
                        <TableRow key={item.id || index}>
                          <TableCell>
                            <Select
                              value={item.product_id}
                              onValueChange={(value) => {
                                updateItem(index, "product_id", value);
                                // Carregar código do fornecedor quando produto for selecionado
                                const selectedProduct = products.find((p) => p.id === value);
                                if (selectedProduct && formData.supplier_id) {
                                  // Buscar código do fornecedor para este produto
                                  loadSupplierCodeForProduct(value, formData.supplier_id).then(
                                    (codigo) => {
                                      if (codigo) {
                                        updateItem(index, "codigo_fornecedor", codigo);
                                      }
                                    }
                                  );
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.nome} ({p.sku_interno || p.codigo})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.codigo_fornecedor || ""}
                              onChange={(e) =>
                                updateItem(index, "codigo_fornecedor", e.target.value)
                              }
                              placeholder="Código do fornecedor"
                              className="w-32 font-mono text-sm"
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
                            }).format(total)}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <div className="text-right">
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
                : purchaseOrder
                ? "Atualizar"
                : "Criar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

