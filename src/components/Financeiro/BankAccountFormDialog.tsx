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

interface BankAccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount?: any;
  onSuccess: () => void;
}

export function BankAccountFormDialog({
  open,
  onOpenChange,
  bankAccount,
  onSuccess,
}: BankAccountFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_banco: "",
    agencia: "",
    conta: "",
    descricao: "",
    saldo_inicial: "0",
    moeda: "BRL",
    status: "ativo",
  });

  useEffect(() => {
    if (open) {
      if (bankAccount) {
        setFormData({
          nome_banco: bankAccount.nome_banco || "",
          agencia: bankAccount.agencia || "",
          conta: bankAccount.conta || "",
          descricao: bankAccount.descricao || "",
          saldo_inicial: bankAccount.saldo_inicial?.toString() || "0",
          moeda: bankAccount.moeda || "BRL",
          status: bankAccount.status || "ativo",
        });
      } else {
        setFormData({
          nome_banco: "",
          agencia: "",
          conta: "",
          descricao: "",
          saldo_inicial: "0",
          moeda: "BRL",
          status: "ativo",
        });
      }
    }
  }, [open, bankAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const saldoInicial = parseFloat(formData.saldo_inicial || "0");
      const dataToSave = {
        nome_banco: formData.nome_banco,
        agencia: formData.agencia,
        conta: formData.conta,
        descricao: formData.descricao || null,
        saldo_inicial: saldoInicial,
        saldo_atual: bankAccount ? bankAccount.saldo_atual : saldoInicial,
        moeda: formData.moeda,
        status: formData.status,
      };

      if (bankAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(dataToSave)
          .eq("id", bankAccount.id);

        if (error) throw error;
        toast.success("Conta bancária atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("bank_accounts")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Conta bancária criada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving bank account:", error);
      toast.error(error.message || "Erro ao salvar conta bancária");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {bankAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}
          </DialogTitle>
          <DialogDescription>
            {bankAccount
              ? "Atualize as informações da conta bancária"
              : "Cadastre uma nova conta bancária para controle financeiro"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome_banco">Nome do Banco *</Label>
              <Input
                id="nome_banco"
                value={formData.nome_banco}
                onChange={(e) =>
                  setFormData({ ...formData, nome_banco: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input
                id="agencia"
                value={formData.agencia}
                onChange={(e) =>
                  setFormData({ ...formData, agencia: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conta">Conta *</Label>
              <Input
                id="conta"
                value={formData.conta}
                onChange={(e) =>
                  setFormData({ ...formData, conta: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="moeda">Moeda</Label>
              <Select
                value={formData.moeda}
                onValueChange={(value) =>
                  setFormData({ ...formData, moeda: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                  <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!bankAccount && (
              <div className="space-y-2">
                <Label htmlFor="saldo_inicial">Saldo Inicial (R$)</Label>
                <Input
                  id="saldo_inicial"
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) =>
                    setFormData({ ...formData, saldo_inicial: e.target.value })
                  }
                />
              </div>
            )}

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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              rows={2}
              placeholder="Ex: Conta Corrente, Conta Pagamentos..."
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
              {loading ? "Salvando..." : bankAccount ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
