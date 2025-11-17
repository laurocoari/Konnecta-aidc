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

interface CotacaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacao?: any;
  productId?: string;
  onSuccess: () => void;
}

export function CotacaoFormDialog({
  open,
  onOpenChange,
  cotacao,
  productId,
  onSuccess,
}: CotacaoFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    product_id: productId || "",
    supplier_id: "",
    preco_unitario: "",
    quantidade_minima: "1",
    prazo_entrega: "",
    validade: "",
    status: "ativo",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      loadProducts();
      loadSuppliers();
      if (cotacao) {
        setFormData({
          product_id: cotacao.product_id,
          supplier_id: cotacao.supplier_id,
          preco_unitario: cotacao.preco_unitario?.toString() || "",
          quantidade_minima: cotacao.quantidade_minima?.toString() || "1",
          prazo_entrega: cotacao.prazo_entrega || "",
          validade: cotacao.validade || "",
          status: cotacao.status || "ativo",
          observacoes: cotacao.observacoes || "",
        });
      } else {
        setFormData({
          product_id: productId || "",
          supplier_id: "",
          preco_unitario: "",
          quantidade_minima: "1",
          prazo_entrega: "",
          validade: "",
          status: "ativo",
          observacoes: "",
        });
      }
    }
  }, [open, cotacao, productId]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, codigo")
      .order("nome");
    if (data) setProducts(data);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, nome")
      .order("nome");
    if (data) setSuppliers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cotacaoData = {
        product_id: formData.product_id,
        supplier_id: formData.supplier_id,
        preco_unitario: parseFloat(formData.preco_unitario),
        quantidade_minima: parseInt(formData.quantidade_minima) || 1,
        prazo_entrega: formData.prazo_entrega || null,
        validade: formData.validade || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        created_by: user?.id,
      };

      if (cotacao) {
        const { error } = await supabase
          .from("product_quotes")
          .update(cotacaoData)
          .eq("id", cotacao.id);

        if (error) throw error;
        toast.success("Cotação atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("product_quotes")
          .insert(cotacaoData);

        if (error) throw error;
        toast.success("Cotação criada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving cotação:", error);
      toast.error(error.message || "Erro ao salvar cotação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {cotacao ? "Editar Cotação" : "Nova Cotação"}
          </DialogTitle>
          <DialogDescription>
            {cotacao
              ? "Atualize os dados da cotação"
              : "Preencha os dados para criar uma nova cotação"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Produto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, product_id: value })
                }
                disabled={!!productId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} - {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fornecedor *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, supplier_id: value })
                }
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
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Preço Unitário (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_unitario}
                onChange={(e) =>
                  setFormData({ ...formData, preco_unitario: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>Quantidade Mínima</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantidade_minima}
                onChange={(e) =>
                  setFormData({ ...formData, quantidade_minima: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Prazo de Entrega</Label>
              <Input
                value={formData.prazo_entrega}
                onChange={(e) =>
                  setFormData({ ...formData, prazo_entrega: e.target.value })
                }
                placeholder="Ex: 15 dias"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Validade</Label>
              <Input
                type="date"
                value={formData.validade}
                onChange={(e) =>
                  setFormData({ ...formData, validade: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Status</Label>
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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                  <SelectItem value="selecionado">Selecionado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              rows={3}
              placeholder="Observações adicionais sobre esta cotação..."
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
              {loading ? "Salvando..." : cotacao ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}




