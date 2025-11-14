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
import {
  createRentalReceiptFromProposal,
  createRentalReceiptFromContract,
} from "@/lib/rentalReceiptService";
import { RentalReceiptPreviewDialog } from "./RentalReceiptPreviewDialog";

interface RentalReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propostaId?: string;
  contratoId?: string;
  onSuccess?: () => void;
}

export function RentalReceiptFormDialog({
  open,
  onOpenChange,
  propostaId,
  contratoId,
  onSuccess,
}: RentalReceiptFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createdReceiptId, setCreatedReceiptId] = useState<string>("");
  const [createdReceiptNumber, setCreatedReceiptNumber] = useState<string>("");
  const [formData, setFormData] = useState({
    tipo_origem: propostaId ? "proposta" : contratoId ? "contrato" : "",
    proposta_id: propostaId || "",
    contrato_id: contratoId || "",
    data_vencimento: "",
    periodo_locacao_inicio: "",
    periodo_locacao_fim: "",
    bank_account_id: "",
    observacoes: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any>(null);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadBankAccounts();
      if (propostaId) {
        loadPropostaData();
      } else if (contratoId) {
        loadContratoData();
      } else {
        // Se não vier proposta ou contrato, carregar listas para seleção
        loadPropostasLocacao();
        loadContratosLocacao();
      }
    }
  }, [open, propostaId, contratoId]);

  const loadPropostasLocacao = async () => {
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, codigo, cliente:clients(nome)")
        .eq("tipo_operacao", "locacao_direta")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPropostas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar propostas:", error);
    }
  };

  const loadContratosLocacao = async () => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, numero, cliente:clients(nome)")
        .eq("tipo", "locacao")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setContratos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar contratos:", error);
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

  const loadPropostaDataById = async (id: string) => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data.tipo_operacao !== "locacao_direta") {
        toast.error("A proposta deve ser do tipo locação direta");
        onOpenChange(false);
        return;
      }

      setSourceData(data);
      setFormData((prev) => ({
        ...prev,
        periodo_locacao_inicio: data.data_proposta || "",
        observacoes: data.observacoes || "",
      }));
    } catch (error: any) {
      console.error("Erro ao carregar proposta:", error);
      toast.error("Erro ao carregar dados da proposta");
    } finally {
      setLoadingData(false);
    }
  };

  const loadPropostaData = async () => {
    if (!propostaId) return;
    await loadPropostaDataById(propostaId);
  };

  const loadContratoDataById = async (id: string) => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data.tipo !== "locacao") {
        toast.error("O contrato deve ser do tipo locação");
        onOpenChange(false);
        return;
      }

      setSourceData(data);
      setFormData((prev) => ({
        ...prev,
        periodo_locacao_inicio: data.data_inicio || "",
        periodo_locacao_fim: data.data_fim || "",
        observacoes: data.observacoes || "",
      }));
    } catch (error: any) {
      console.error("Erro ao carregar contrato:", error);
      toast.error("Erro ao carregar dados do contrato");
    } finally {
      setLoadingData(false);
    }
  };

  const loadContratoData = async () => {
    if (!contratoId) return;
    await loadContratoDataById(contratoId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const propostaIdToUse = propostaId || formData.proposta_id;
      const contratoIdToUse = contratoId || formData.contrato_id;

      if (!propostaIdToUse && !contratoIdToUse) {
        throw new Error("Selecione uma proposta ou contrato");
      }

      let result;

      if (propostaIdToUse) {
        result = await createRentalReceiptFromProposal(propostaIdToUse, {
          data_vencimento: formData.data_vencimento || undefined,
          periodo_locacao_inicio: formData.periodo_locacao_inicio || undefined,
          periodo_locacao_fim: formData.periodo_locacao_fim || undefined,
          bank_account_id: formData.bank_account_id || undefined,
          observacoes: formData.observacoes || undefined,
        });
      } else if (contratoIdToUse) {
        result = await createRentalReceiptFromContract(contratoIdToUse, {
          data_vencimento: formData.data_vencimento || undefined,
          periodo_locacao_inicio: formData.periodo_locacao_inicio || undefined,
          periodo_locacao_fim: formData.periodo_locacao_fim || undefined,
          bank_account_id: formData.bank_account_id || undefined,
          observacoes: formData.observacoes || undefined,
        });
      } else {
        throw new Error("Proposta ou contrato deve ser informado");
      }

      setCreatedReceiptId(result.id);
      setCreatedReceiptNumber(result.numero_recibo);
      toast.success(`Recibo ${result.numero_recibo} criado com sucesso!`);
      setPreviewOpen(true);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao criar recibo:", error);
      toast.error("Erro ao criar recibo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Recibo de Locação</DialogTitle>
            <DialogDescription>
              {propostaId
                ? "Criar recibo a partir da proposta selecionada"
                : contratoId
                ? "Criar recibo a partir do contrato selecionado"
                : "Selecione uma proposta ou contrato de locação"}
            </DialogDescription>
          </DialogHeader>

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!propostaId && !contratoId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tipo_origem">Origem do Recibo</Label>
                    <Select
                      value={formData.tipo_origem}
                      onValueChange={(value) =>
                        setFormData({ ...formData, tipo_origem: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposta">Proposta</SelectItem>
                        <SelectItem value="contrato">Contrato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.tipo_origem === "proposta" && (
                    <div className="space-y-2">
                      <Label htmlFor="proposta_id">Proposta</Label>
                      <Select
                        value={formData.proposta_id}
                        onValueChange={(value) => {
                          setFormData({ ...formData, proposta_id: value });
                          const proposta = propostas.find((p) => p.id === value);
                          if (proposta) {
                            loadPropostaDataById(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma proposta" />
                        </SelectTrigger>
                        <SelectContent>
                          {propostas.map((proposta) => (
                            <SelectItem key={proposta.id} value={proposta.id}>
                              {proposta.codigo} - {proposta.cliente?.nome || "N/A"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.tipo_origem === "contrato" && (
                    <div className="space-y-2">
                      <Label htmlFor="contrato_id">Contrato</Label>
                      <Select
                        value={formData.contrato_id}
                        onValueChange={(value) => {
                          setFormData({ ...formData, contrato_id: value });
                          const contrato = contratos.find((c) => c.id === value);
                          if (contrato) {
                            loadContratoDataById(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um contrato" />
                        </SelectTrigger>
                        <SelectContent>
                          {contratos.map((contrato) => (
                            <SelectItem key={contrato.id} value={contrato.id}>
                              {contrato.numero} - {contrato.cliente?.nome || "N/A"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_id">
                  Conta Bancária (Opcional)
                </Label>
                <Select
                  value={formData.bank_account_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, bank_account_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
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

