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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AccountsPayableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountPayable?: any;
  onSuccess: () => void;
}

export function AccountsPayableFormDialog({
  open,
  onOpenChange,
  accountPayable,
  onSuccess,
}: AccountsPayableFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    beneficiario_tipo: "fornecedor",
    beneficiario_id: "",
    beneficiario_nome: "",
    origem: "compra",
    referencia_id: "",
    valor_total: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      loadSuppliers();
      loadUsers();
      if (accountPayable) {
        setFormData({
          beneficiario_tipo: accountPayable.beneficiario_tipo || "fornecedor",
          beneficiario_id: accountPayable.beneficiario_id || "",
          beneficiario_nome: accountPayable.beneficiario_nome || "",
          origem: accountPayable.origem || "compra",
          referencia_id: accountPayable.referencia_id || "",
          valor_total: accountPayable.valor_total?.toString() || "",
          data_emissao: accountPayable.data_emissao || new Date().toISOString().split("T")[0],
          data_vencimento: accountPayable.data_vencimento || "",
          observacoes: accountPayable.observacoes || "",
        });
      } else {
        setFormData({
          beneficiario_tipo: "fornecedor",
          beneficiario_id: "",
          beneficiario_nome: "",
          origem: "compra",
          referencia_id: "",
          valor_total: "",
          data_emissao: new Date().toISOString().split("T")[0],
          data_vencimento: "",
          observacoes: "",
        });
      }
    }
  }, [open, accountPayable]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, nome")
        .eq("status", "ativo")
        .order("nome");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Error loading suppliers:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["comercial", "revendedor"])
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.beneficiario_tipo !== "outro" && !formData.beneficiario_id) {
      toast.error("Selecione um beneficiário");
      return;
    }

    if (formData.beneficiario_tipo === "outro" && !formData.beneficiario_nome) {
      toast.error("Informe o nome do beneficiário");
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        beneficiario_id: formData.beneficiario_tipo === "outro" ? null : formData.beneficiario_id,
        beneficiario_nome: formData.beneficiario_tipo === "outro" ? formData.beneficiario_nome : null,
        valor_total: parseFloat(formData.valor_total),
        referencia_id: formData.referencia_id || null,
        created_by: user?.id,
      };

      if (accountPayable) {
        const { error } = await supabase
          .from("accounts_payable")
          .update(dataToSave)
          .eq("id", accountPayable.id);

        if (error) throw error;
        toast.success("Conta a pagar atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("accounts_payable")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Conta a pagar criada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving account payable:", error);
      toast.error(error.message || "Erro ao salvar conta a pagar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {accountPayable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
          </DialogTitle>
          <DialogDescription>
            {accountPayable
              ? "Atualize as informações da conta a pagar"
              : "Registre um novo valor a pagar"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="beneficiario_tipo">Tipo de Beneficiário *</Label>
              <Select
                value={formData.beneficiario_tipo}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    beneficiario_tipo: value,
                    beneficiario_id: "",
                    beneficiario_nome: "",
                  })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="usuario">Vendedor/Revendedor</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiario">
                {formData.beneficiario_tipo === "outro" ? "Nome do Beneficiário *" : "Beneficiário *"}
              </Label>
              {formData.beneficiario_tipo === "outro" ? (
                <Input
                  id="beneficiario_nome"
                  value={formData.beneficiario_nome}
                  onChange={(e) =>
                    setFormData({ ...formData, beneficiario_nome: e.target.value })
                  }
                  required
                />
              ) : formData.beneficiario_tipo === "fornecedor" ? (
                <Select
                  value={formData.beneficiario_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, beneficiario_id: value })
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
              ) : (
                <Select
                  value={formData.beneficiario_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, beneficiario_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="origem">Origem *</Label>
              <Select
                value={formData.origem}
                onValueChange={(value) =>
                  setFormData({ ...formData, origem: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="comissao">Comissão</SelectItem>
                  <SelectItem value="imposto">Imposto</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total (R$) *</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_total}
                onChange={(e) =>
                  setFormData({ ...formData, valor_total: e.target.value })
                }
                required
              />
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
              <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    data_vencimento: e.target.value,
                  })
                }
                required
              />
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
                : accountPayable
                ? "Atualizar"
                : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

