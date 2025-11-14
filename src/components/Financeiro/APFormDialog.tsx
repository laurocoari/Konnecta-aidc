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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface APFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountPayable?: any;
  onSuccess: () => void;
}

export function APFormDialog({
  open,
  onOpenChange,
  accountPayable,
  onSuccess,
}: APFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [beneficiaryType, setBeneficiaryType] = useState<"fornecedor" | "usuario" | "outro">("fornecedor");
  const [formData, setFormData] = useState({
    beneficiario_id: "",
    origem: "",
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
        setBeneficiaryType(accountPayable.beneficiario_tipo);
        setFormData({
          beneficiario_id: accountPayable.beneficiario_id || "",
          origem: accountPayable.origem || "",
          referencia_id: accountPayable.referencia_id || "",
          valor_total: accountPayable.valor_total?.toString() || "",
          data_emissao: accountPayable.data_emissao || new Date().toISOString().split("T")[0],
          data_vencimento: accountPayable.data_vencimento || "",
          observacoes: accountPayable.observacoes || "",
        });
      } else {
        setBeneficiaryType("fornecedor");
        setFormData({
          beneficiario_id: "",
          origem: "",
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
        .in("role", ["admin", "comercial", "revendedor"])
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        beneficiario_tipo: beneficiaryType,
        beneficiario_id: formData.beneficiario_id,
        origem: formData.origem,
        valor_total: parseFloat(formData.valor_total),
        referencia_id: formData.referencia_id || null,
        data_emissao: formData.data_emissao,
        data_vencimento: formData.data_vencimento,
        observacoes: formData.observacoes,
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
      console.error("Error saving AP:", error);
      toast.error(error.message || "Erro ao salvar conta a pagar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {accountPayable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
          </DialogTitle>
          <DialogDescription>
            {accountPayable
              ? "Atualize as informações da conta a pagar"
              : "Registre uma nova obrigação de pagamento"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Beneficiário *</Label>
            <Tabs value={beneficiaryType} onValueChange={(v) => {
              setBeneficiaryType(v as any);
              setFormData({ ...formData, beneficiario_id: "" });
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
                <TabsTrigger value="usuario">Usuário</TabsTrigger>
                <TabsTrigger value="outro">Outro</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiario_id">
              {beneficiaryType === "fornecedor"
                ? "Fornecedor *"
                : beneficiaryType === "usuario"
                ? "Usuário *"
                : "Nome do Beneficiário *"}
            </Label>
            {beneficiaryType === "fornecedor" ? (
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
            ) : beneficiaryType === "usuario" ? (
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
            ) : (
              <Input
                id="beneficiario_id"
                value={formData.beneficiario_id}
                onChange={(e) =>
                  setFormData({ ...formData, beneficiario_id: e.target.value })
                }
                placeholder="Nome do beneficiário"
                required
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectValue placeholder="Selecione a origem" />
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
                  setFormData({ ...formData, data_vencimento: e.target.value })
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
              {loading ? "Salvando..." : accountPayable ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


