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
import { Loader2 } from "lucide-react";
import { createRentalReceiptFromAccountReceivable } from "@/lib/rentalReceiptService";
import { RentalReceiptPreviewDialog } from "./RentalReceiptPreviewDialog";

interface RentalReceiptFromARDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountReceivable: any;
  onSuccess?: () => void;
}

export function RentalReceiptFromARDialog({
  open,
  onOpenChange,
  accountReceivable,
  onSuccess,
}: RentalReceiptFromARDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createdReceiptId, setCreatedReceiptId] = useState<string>("");
  const [createdReceiptNumber, setCreatedReceiptNumber] = useState<string>("");
  const [formData, setFormData] = useState({
    data_vencimento: "",
    periodo_locacao_inicio: "",
    periodo_locacao_fim: "",
    bank_account_id: "",
    observacoes: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [accountData, setAccountData] = useState<any>(null);

  useEffect(() => {
    if (open && accountReceivable) {
      loadAccountData();
      loadBankAccounts();
    }
  }, [open, accountReceivable]);

  const loadAccountData = async () => {
    if (!accountReceivable?.id) return;

    setLoadingData(true);
    try {
      // Buscar dados completos da conta a receber com proposta relacionada
      const { data: arData, error: arError } = await supabase
        .from("accounts_receivable")
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq("id", accountReceivable.id)
        .single();

      if (arError) throw arError;

      // Buscar proposta relacionada
      let proposta: any = null;
      if (arData.origem === "proposta" && arData.referencia_id) {
        const { data: propostaData, error: propostaError } = await supabase
          .from("proposals")
          .select("*")
          .eq("id", arData.referencia_id)
          .single();

        if (!propostaError) {
          proposta = propostaData;
        }
      } else if (arData.origem === "pedido_venda" && arData.referencia_id) {
        const { data: pedido, error: pedidoError } = await supabase
          .from("sales_orders")
          .select(`
            *,
            proposta:proposals(*)
          `)
          .eq("id", arData.referencia_id)
          .single();

        if (!pedidoError && pedido?.proposta) {
          proposta = pedido.proposta;
        }
      }

      if (!proposta) {
        toast.error("Não foi possível encontrar proposta relacionada");
        onOpenChange(false);
        return;
      }

      // Validar que é locação
      if (!proposta.tipo_operacao?.includes("locacao")) {
        toast.error("Conta a receber deve ser de locação");
        onOpenChange(false);
        return;
      }

      setAccountData({ ...arData, proposta });

      // Pré-preencher formulário
      const periodoInicio = proposta.condicoes_comerciais?.prazo_inicio_contrato || arData.data_vencimento;
      const periodoFim = proposta.condicoes_comerciais?.prazo_fim_contrato || "";

      setFormData({
        data_vencimento: arData.data_vencimento || "",
        periodo_locacao_inicio: periodoInicio || "",
        periodo_locacao_fim: periodoFim || "",
        bank_account_id: "",
        observacoes: arData.observacoes || `Mensalidade - Conta a receber ${arData.id}`,
      });
    } catch (error: any) {
      console.error("Erro ao carregar dados da conta:", error);
      toast.error("Erro ao carregar dados da conta a receber");
    } finally {
      setLoadingData(false);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("status", "ativo")
        .order("nome_banco");

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar contas bancárias:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountReceivable?.id) {
      toast.error("Conta a receber não informada");
      return;
    }

    setLoading(true);

    try {
      const result = await createRentalReceiptFromAccountReceivable(
        accountReceivable.id,
        {
          data_vencimento: formData.data_vencimento || undefined,
          periodo_locacao_inicio: formData.periodo_locacao_inicio || undefined,
          periodo_locacao_fim: formData.periodo_locacao_fim || undefined,
          bank_account_id: formData.bank_account_id || undefined,
          observacoes: formData.observacoes || undefined,
        }
      );

      setCreatedReceiptId(result.id);
      setCreatedReceiptNumber(result.numero_recibo);
      toast.success(`Recibo ${result.numero_recibo} criado com sucesso!`);
      setPreviewOpen(true);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao criar recibo:", error);
      toast.error("Erro ao criar recibo: " + (error.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  if (!accountReceivable) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Recibo de Locação</DialogTitle>
            <DialogDescription>
              Criar recibo de locação a partir da conta a receber selecionada
            </DialogDescription>
          </DialogHeader>

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {accountData && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="text-sm">
                    <strong>Cliente:</strong> {accountData.contact?.nome || "N/A"}
                  </div>
                  <div className="text-sm">
                    <strong>Valor:</strong>{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(parseFloat(accountData.valor_total || 0))}
                  </div>
                  {accountData.proposta && (
                    <div className="text-sm">
                      <strong>Proposta:</strong> {accountData.proposta.codigo || accountData.proposta.id}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodo_locacao_inicio">
                    Período de Locação - Início
                  </Label>
                  <Input
                    id="periodo_locacao_inicio"
                    type="date"
                    value={formData.periodo_locacao_inicio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        periodo_locacao_inicio: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodo_locacao_fim">
                    Período de Locação - Fim
                  </Label>
                  <Input
                    id="periodo_locacao_fim"
                    type="date"
                    value={formData.periodo_locacao_fim}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        periodo_locacao_fim: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data de Vencimento</Label>
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

              <div className="space-y-2">
                <Label htmlFor="bank_account_id">
                  Conta Bancária (Opcional)
                </Label>
                <Select
                  value={formData.bank_account_id || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, bank_account_id: value || "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nome_banco} - {account.agencia} / {account.conta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={4}
                  placeholder="Observações adicionais do recibo..."
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
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar Recibo"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {createdReceiptId && (
        <RentalReceiptPreviewDialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) {
              onOpenChange(false);
            }
          }}
          receiptId={createdReceiptId}
          numeroRecibo={createdReceiptNumber}
        />
      )}
    </>
  );
}

