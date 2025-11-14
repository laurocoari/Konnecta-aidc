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

interface PaymentPayableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountPayable: any;
  onSuccess: () => void;
}

export function PaymentPayableDialog({
  open,
  onOpenChange,
  accountPayable,
  onSuccess,
}: PaymentPayableDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    valor: "",
    data_pagamento: new Date().toISOString().split("T")[0],
    forma_pagamento: "pix",
    bank_account_id: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open && accountPayable) {
      loadBankAccounts();
      const saldo = accountPayable.valor_total - accountPayable.valor_pago;
      setFormData({
        valor: saldo.toString(),
        data_pagamento: new Date().toISOString().split("T")[0],
        forma_pagamento: "pix",
        bank_account_id: "",
        observacoes: "",
      });
    }
  }, [open, accountPayable]);

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
    if (!accountPayable) return;

    const valorPago = parseFloat(formData.valor);
    const saldo = accountPayable.valor_total - accountPayable.valor_pago;

    if (valorPago <= 0) {
      toast.error("O valor deve ser maior que zero");
      return;
    }

    if (valorPago > saldo) {
      toast.error(`O valor não pode ser maior que o saldo em aberto (${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`);
      return;
    }

    setLoading(true);

    try {
      // Criar registro de pagamento
      const { data: paymentData, error: paymentError } = await supabase
        .from("accounts_payable_payments")
        .insert([
          {
            accounts_payable_id: accountPayable.id,
            bank_account_id: formData.bank_account_id,
            valor: valorPago,
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
            valor: valorPago,
            data_movimento: formData.data_pagamento,
            descricao: `Pagamento - ${accountPayable.beneficiario_nome || accountPayable.beneficiario?.nome || "Beneficiário"}`,
            referencia_tipo: "accounts_payable",
            referencia_id: accountPayable.id,
            created_by: user?.id,
          },
        ]);

      if (transactionError) throw transactionError;

      toast.success("Pagamento registrado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error registering payment:", error);
      toast.error(error.message || "Erro ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };

  if (!accountPayable) return null;

  const saldo = accountPayable.valor_total - accountPayable.valor_pago;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Registre o pagamento da conta a pagar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mb-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Beneficiário</div>
            <div className="font-semibold">
              {accountPayable.beneficiario?.nome || accountPayable.beneficiario_nome || "N/A"}
            </div>
            <div className="text-sm text-muted-foreground mt-2">Valor Total</div>
            <div className="font-semibold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(accountPayable.valor_total)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">Valor Pago</div>
            <div className="font-semibold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(accountPayable.valor_pago)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">Saldo em Aberto</div>
            <div className="font-semibold text-red-600">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(saldo)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor do Pagamento (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                max={saldo}
                value={formData.valor}
                onChange={(e) =>
                  setFormData({ ...formData, valor: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(saldo)}
              </p>
            </div>

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

            <div className="space-y-2">
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
              {loading ? "Registrando..." : "Registrar Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

