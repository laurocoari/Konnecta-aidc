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

interface ARPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountReceivable: any;
  onSuccess: () => void;
}

export function ARPaymentDialog({
  open,
  onOpenChange,
  accountReceivable,
  onSuccess,
}: ARPaymentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    bank_account_id: "",
    valor: "",
    data_pagamento: new Date().toISOString().split("T")[0],
    forma_pagamento: "pix",
    observacoes: "",
  });

  useEffect(() => {
    if (open && accountReceivable) {
      loadBankAccounts();
      const saldo = parseFloat(accountReceivable.valor_total || 0) - parseFloat(accountReceivable.valor_pago || 0);
      setFormData({
        bank_account_id: "",
        valor: saldo.toString(),
        data_pagamento: new Date().toISOString().split("T")[0],
        forma_pagamento: "pix",
        observacoes: "",
      });
    }
  }, [open, accountReceivable]);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, nome_banco, conta, descricao")
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
    if (!accountReceivable) {
      toast.error("Conta a receber não encontrada");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Verificar se bank_account_id é obrigatório (baseado na estrutura da tabela)
    // Se a tabela permite NULL, podemos tornar opcional
    // Por enquanto, vamos manter como obrigatório para garantir integridade
    if (!formData.bank_account_id) {
      toast.error("Selecione uma conta bancária");
      return;
    }

    const valorPago = parseFloat(formData.valor);
    
    if (isNaN(valorPago)) {
      toast.error("Valor inválido");
      return;
    }

    const saldo = parseFloat(accountReceivable.valor_total || 0) - parseFloat(accountReceivable.valor_pago || 0);

    if (valorPago > saldo) {
      toast.error("Valor do pagamento não pode ser maior que o saldo em aberto");
      return;
    }

    if (valorPago <= 0) {
      toast.error("Valor do pagamento deve ser maior que zero");
      return;
    }

    setLoading(true);

    try {
      // Criar registro de pagamento
      const { data: payment, error: paymentError } = await supabase
        .from("accounts_receivable_payments")
        .insert([
          {
            accounts_receivable_id: accountReceivable.id,
            bank_account_id: formData.bank_account_id,
            valor: valorPago,
            data_pagamento: formData.data_pagamento,
            forma_pagamento: formData.forma_pagamento,
            observacoes: formData.observacoes || null,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (paymentError) {
        console.error("Payment error:", paymentError);
        throw paymentError;
      }

      // Criar transação bancária de entrada apenas se houver conta bancária
      if (formData.bank_account_id) {
        const { error: transactionError } = await supabase
          .from("bank_transactions")
          .insert([
            {
              bank_account_id: formData.bank_account_id,
              tipo: "entrada",
              valor: valorPago,
              data_movimento: formData.data_pagamento,
              descricao: `Recebimento - ${accountReceivable.contact?.nome || accountReceivable.cliente?.nome || "Cliente"}`,
              referencia_tipo: "accounts_receivable",
              referencia_id: accountReceivable.id,
              created_by: user.id,
            },
          ]);

        if (transactionError) {
          console.error("Transaction error:", transactionError);
          // Não lançar erro aqui, apenas logar - o pagamento já foi registrado
          console.warn("Transação bancária não foi criada, mas pagamento foi registrado");
        }
      }

      toast.success("Pagamento registrado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error registering payment:", error);
      const errorMessage = error?.message || error?.details || "Erro ao registrar pagamento";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!accountReceivable) return null;

  const saldo = parseFloat(accountReceivable.valor_total || 0) - parseFloat(accountReceivable.valor_pago || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Registre o recebimento da conta a receber
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 rounded-lg bg-muted p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-semibold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(accountReceivable.valor_total || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Saldo em Aberto</p>
              <p className="font-semibold text-warning">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(saldo)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.nome_banco} - {acc.conta} {acc.descricao ? `(${acc.descricao})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
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
              <Label htmlFor="data_pagamento">Data do Pagamento</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) =>
                  setFormData({ ...formData, data_pagamento: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) =>
                  setFormData({ ...formData, forma_pagamento: value })
                }
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


