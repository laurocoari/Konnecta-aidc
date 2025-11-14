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

interface PayCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commission: any;
  onSuccess: () => void;
}

export function PayCommissionDialog({
  open,
  onOpenChange,
  commission,
  onSuccess,
}: PayCommissionDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    data_pagamento: new Date().toISOString().split("T")[0],
    forma_pagamento: "pix",
    bank_account_id: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open && commission) {
      loadBankAccounts();
      setFormData({
        data_pagamento: new Date().toISOString().split("T")[0],
        forma_pagamento: "pix",
        bank_account_id: "",
        observacoes: "",
      });
    }
  }, [open, commission]);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, nome_banco, agencia, conta, descricao")
        .eq("status", "ativo")
        .order("nome_banco");

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading bank accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commission) return;

    setLoading(true);

    try {
      // Criar conta a pagar para a comissão
      const { data: apData, error: apError } = await supabase
        .from("accounts_payable")
        .insert([
          {
            beneficiario_tipo: "usuario",
            beneficiario_id: commission.user_id,
            origem: "comissao",
            referencia_id: commission.id,
            valor_total: commission.valor_comissao,
            data_emissao: formData.data_pagamento,
            data_vencimento: formData.data_pagamento,
            observacoes: `Comissão - ${commission.observacoes || ""}`,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (apError) throw apError;

      // Criar pagamento da conta a pagar
      const { data: paymentData, error: paymentError } = await supabase
        .from("accounts_payable_payments")
        .insert([
          {
            accounts_payable_id: apData.id,
            bank_account_id: formData.bank_account_id,
            valor: commission.valor_comissao,
            data_pagamento: formData.data_pagamento,
            forma_pagamento: formData.forma_pagamento,
            observacoes: formData.observacoes,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Criar transação bancária de saída
      const { error: transactionError } = await supabase
        .from("bank_transactions")
        .insert([
          {
            bank_account_id: formData.bank_account_id,
            tipo: "saida",
            valor: commission.valor_comissao,
            data_movimento: formData.data_pagamento,
            descricao: `Pagamento de Comissão - ${commission.user?.full_name || "Vendedor"}`,
            referencia_tipo: "commission",
            referencia_id: commission.id,
            created_by: user?.id,
          },
        ]);

      if (transactionError) throw transactionError;

      // Atualizar status da comissão
      const { error: updateError } = await supabase
        .from("commissions")
        .update({
          status: "pago",
          data_pagamento: formData.data_pagamento,
          accounts_payable_id: apData.id,
        })
        .eq("id", commission.id);

      if (updateError) throw updateError;

      toast.success("Comissão paga com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error paying commission:", error);
      toast.error(error.message || "Erro ao pagar comissão");
    } finally {
      setLoading(false);
    }
  };

  if (!commission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pagar Comissão</DialogTitle>
          <DialogDescription>
            Registre o pagamento da comissão
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mb-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Vendedor/Revendedor</div>
            <div className="font-semibold">
              {commission.user?.full_name || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground mt-2">Valor da Comissão</div>
            <div className="font-semibold text-green-600">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(commission.valor_comissao)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data do Pagamento *</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) =>
                  setFormData({ ...formData, data_pagamento: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) =>
                  setFormData({ ...formData, forma_pagamento: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bank_account_id">Conta Bancária *</Label>
              <Select
                value={formData.bank_account_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, bank_account_id: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome_banco} - {account.agencia}/{account.conta}
                      {account.descricao && ` (${account.descricao})`}
                    </SelectItem>
                  ))}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processando..." : "Pagar Comissão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

