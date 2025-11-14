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

interface AccountsReceivableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountReceivable?: any;
  onSuccess: () => void;
}

export function AccountsReceivableFormDialog({
  open,
  onOpenChange,
  accountReceivable,
  onSuccess,
}: AccountsReceivableFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    contact_id: "",
    origem: "venda",
    referencia_id: "",
    valor_total: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      loadContacts();
      if (accountReceivable) {
        setFormData({
          contact_id: accountReceivable.contact_id || "",
          origem: accountReceivable.origem || "venda",
          referencia_id: accountReceivable.referencia_id || "",
          valor_total: accountReceivable.valor_total?.toString() || "",
          data_emissao: accountReceivable.data_emissao || new Date().toISOString().split("T")[0],
          data_vencimento: accountReceivable.data_vencimento || "",
          observacoes: accountReceivable.observacoes || "",
        });
      } else {
        setFormData({
          contact_id: "",
          origem: "venda",
          referencia_id: "",
          valor_total: "",
          data_emissao: new Date().toISOString().split("T")[0],
          data_vencimento: "",
          observacoes: "",
        });
      }
    }
  }, [open, accountReceivable]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nome, empresa")
        .eq("tipo", "cliente")
        .order("nome");

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error loading contacts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        contact_id: formData.contact_id,
        valor_total: parseFloat(formData.valor_total),
        referencia_id: formData.referencia_id || null,
        created_by: user?.id,
      };

      if (accountReceivable) {
        const { error } = await supabase
          .from("accounts_receivable")
          .update(dataToSave)
          .eq("id", accountReceivable.id);

        if (error) throw error;
        toast.success("Conta a receber atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("accounts_receivable")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Conta a receber criada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving account receivable:", error);
      toast.error(error.message || "Erro ao salvar conta a receber");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {accountReceivable
              ? "Editar Conta a Receber"
              : "Nova Conta a Receber"}
          </DialogTitle>
          <DialogDescription>
            {accountReceivable
              ? "Atualize as informações da conta a receber"
              : "Registre um novo valor a receber de um cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_id">Cliente *</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, contact_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.empresa ? `- ${c.empresa}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
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
                : accountReceivable
                ? "Atualizar"
                : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

