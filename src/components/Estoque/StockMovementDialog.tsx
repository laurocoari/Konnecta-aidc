import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem?: any;
  warehouses: any[];
  onSuccess: () => void;
}

export function StockMovementDialog({
  open,
  onOpenChange,
  inventoryItem,
  warehouses,
  onSuccess,
}: StockMovementDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tipo: "entrada",
    product_id: "",
    warehouse_id: "",
    quantidade: "",
    descricao: "",
    origem_warehouse_id: "",
    destino_warehouse_id: "",
  });

  useEffect(() => {
    if (open) {
      loadProducts();
      if (inventoryItem) {
        setFormData({
          tipo: "entrada",
          product_id: inventoryItem.product_id,
          warehouse_id: inventoryItem.warehouse_id,
          quantidade: "",
          descricao: "",
          origem_warehouse_id: "",
          destino_warehouse_id: "",
        });
      } else {
        setFormData({
          tipo: "entrada",
          product_id: "",
          warehouse_id: warehouses[0]?.id || "",
          quantidade: "",
          descricao: "",
          origem_warehouse_id: "",
          destino_warehouse_id: "",
        });
      }
    }
  }, [open, inventoryItem, warehouses]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, codigo, sku_interno")
      .eq("status", "ativo")
      .order("nome");
    if (data) setProducts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Buscar ou criar registro de inventory
      let inventoryId: string;
      let currentQuantity = 0;

      if (inventoryItem) {
        inventoryId = inventoryItem.id;
        currentQuantity = inventoryItem.quantidade || 0;
      } else {
        // Verificar se já existe inventory para este produto e depósito
        const { data: existingInventory } = await supabase
          .from("inventory")
          .select("id, quantidade")
          .eq("product_id", formData.product_id)
          .eq("warehouse_id", formData.warehouse_id)
          .single();

        if (existingInventory) {
          inventoryId = existingInventory.id;
          currentQuantity = existingInventory.quantidade || 0;
        } else {
          // Criar novo registro de inventory
          const { data: newInventory, error: invError } = await supabase
            .from("inventory")
            .insert({
              product_id: formData.product_id,
              warehouse_id: formData.warehouse_id,
              quantidade: 0,
            })
            .select("id")
            .single();

          if (invError) throw invError;
          inventoryId = newInventory.id;
          currentQuantity = 0;
        }
      }

      const quantidadeMovimento = parseInt(formData.quantidade);

      // Validar saída: não permitir sair mais do que tem em estoque
      if (formData.tipo === "saida" && quantidadeMovimento > currentQuantity) {
        toast.error(`Estoque insuficiente! Disponível: ${currentQuantity}`);
        setLoading(false);
        return;
      }

      // Validar transferência: verificar estoque no depósito origem
      if (formData.tipo === "transferencia") {
        const origemWarehouseId = formData.origem_warehouse_id || formData.warehouse_id;
        const { data: origemInventory } = await supabase
          .from("inventory")
          .select("quantidade")
          .eq("product_id", formData.product_id)
          .eq("warehouse_id", origemWarehouseId)
          .maybeSingle();

        const origemQty = origemInventory?.quantidade || 0;
        if (quantidadeMovimento > origemQty) {
          toast.error(`Estoque insuficiente no depósito origem! Disponível: ${origemQty}`);
          setLoading(false);
          return;
        }
      }

      // Criar movimentação
      const movementData: any = {
        inventory_id: inventoryId,
        tipo: formData.tipo,
        quantidade: quantidadeMovimento,
        descricao: formData.descricao || null,
        created_by: user?.id,
      };

      if (formData.tipo === "transferencia") {
        movementData.origem_warehouse_id = formData.origem_warehouse_id || formData.warehouse_id;
        movementData.destino_warehouse_id = formData.destino_warehouse_id;
      }

      const { error } = await supabase.from("stock_movements").insert(movementData);

      if (error) throw error;
      toast.success("Movimentação registrada com sucesso! Estoque atualizado automaticamente.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving movement:", error);
      toast.error(error.message || "Erro ao registrar movimentação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
          <DialogDescription>
            Registre uma entrada, saída, ajuste ou transferência de estoque
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Tipo de Movimentação *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!inventoryItem && (
              <div>
                <Label>Produto *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sku_interno || p.codigo} - {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {formData.tipo === "transferencia" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Depósito de Origem *</Label>
                <Select
                  value={formData.origem_warehouse_id || formData.warehouse_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, origem_warehouse_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Depósito de Destino *</Label>
                <Select
                  value={formData.destino_warehouse_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destino_warehouse_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== (formData.origem_warehouse_id || formData.warehouse_id))
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div>
              <Label>Depósito *</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, warehouse_id: value })
                }
                disabled={!!inventoryItem}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantidade}
              onChange={(e) =>
                setFormData({ ...formData, quantidade: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              rows={3}
              placeholder="Motivo da movimentação, observações..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Movimentação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

