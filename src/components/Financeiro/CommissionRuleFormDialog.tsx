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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommissionRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: any;
  onSuccess: () => void;
}

export function CommissionRuleFormDialog({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: CommissionRuleFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    user_id: "",
    tipo_base: "geral",
    produto_id: "",
    categoria_id: "",
    percentual: "",
    valor_fixo: "",
    vigencia_inicio: new Date().toISOString().split("T")[0],
    vigencia_fim: "",
    status: "ativa",
  });

  useEffect(() => {
    if (open) {
      loadUsers();
      loadProducts();
      if (rule) {
        setFormData({
          user_id: rule.user_id || "",
          tipo_base: rule.tipo_base || "geral",
          produto_id: rule.produto_id || "",
          categoria_id: rule.categoria_id || "",
          percentual: rule.percentual?.toString() || "",
          valor_fixo: rule.valor_fixo?.toString() || "",
          vigencia_inicio: rule.vigencia_inicio || new Date().toISOString().split("T")[0],
          vigencia_fim: rule.vigencia_fim || "",
          status: rule.status || "ativa",
        });
      } else {
        setFormData({
          user_id: "",
          tipo_base: "geral",
          produto_id: "",
          categoria_id: "",
          percentual: "",
          valor_fixo: "",
          vigencia_inicio: new Date().toISOString().split("T")[0],
          vigencia_fim: "",
          status: "ativa",
        });
      }
    }
  }, [open, rule]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "comercial", "revendedor"])
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome")
        .order("nome")
        .limit(100);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.percentual && !formData.valor_fixo) {
        toast.error("Informe percentual ou valor fixo");
        return;
      }

      const dataToSave = {
        user_id: formData.user_id,
        tipo_base: formData.tipo_base,
        produto_id: formData.tipo_base === "produto" && formData.produto_id ? formData.produto_id : null,
        categoria_id: formData.tipo_base === "categoria" && formData.categoria_id ? formData.categoria_id : null,
        percentual: formData.percentual ? parseFloat(formData.percentual) : null,
        valor_fixo: formData.valor_fixo ? parseFloat(formData.valor_fixo) : null,
        vigencia_inicio: formData.vigencia_inicio,
        vigencia_fim: formData.vigencia_fim || null,
        status: formData.status,
      };

      if (rule) {
        const { error } = await supabase
          .from("commission_rules")
          .update(dataToSave)
          .eq("id", rule.id);

        if (error) throw error;
        toast.success("Regra atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("commission_rules")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Regra criada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving rule:", error);
      toast.error(error.message || "Erro ao salvar regra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Editar Regra de Comissão" : "Nova Regra de Comissão"}
          </DialogTitle>
          <DialogDescription>
            {rule
              ? "Atualize as informações da regra de comissão"
              : "Configure uma nova regra para cálculo de comissões"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user_id">Vendedor/Revendedor *</Label>
              <Select
                value={formData.user_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, user_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_base">Tipo Base *</Label>
              <Select
                value={formData.tipo_base}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    tipo_base: value,
                    produto_id: "",
                    categoria_id: "",
                  })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="categoria">Categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_base === "produto" && (
              <div className="space-y-2">
                <Label htmlFor="produto_id">Produto *</Label>
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, produto_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.tipo_base === "categoria" && (
              <div className="space-y-2">
                <Label htmlFor="categoria_id">Categoria *</Label>
                <Input
                  id="categoria_id"
                  value={formData.categoria_id}
                  onChange={(e) =>
                    setFormData({ ...formData, categoria_id: e.target.value })
                  }
                  placeholder="Nome da categoria"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="percentual">Percentual (%)</Label>
              <Input
                id="percentual"
                type="number"
                step="0.01"
                value={formData.percentual}
                onChange={(e) =>
                  setFormData({ ...formData, percentual: e.target.value })
                }
                placeholder="Ex: 5.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_fixo">Valor Fixo (R$)</Label>
              <Input
                id="valor_fixo"
                type="number"
                step="0.01"
                value={formData.valor_fixo}
                onChange={(e) =>
                  setFormData({ ...formData, valor_fixo: e.target.value })
                }
                placeholder="Ex: 100.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vigencia_inicio">Vigência Início *</Label>
              <Input
                id="vigencia_inicio"
                type="date"
                value={formData.vigencia_inicio}
                onChange={(e) =>
                  setFormData({ ...formData, vigencia_inicio: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vigencia_fim">Vigência Fim</Label>
              <Input
                id="vigencia_fim"
                type="date"
                value={formData.vigencia_fim}
                onChange={(e) =>
                  setFormData({ ...formData, vigencia_fim: e.target.value })
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
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
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
              {loading ? "Salvando..." : rule ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
