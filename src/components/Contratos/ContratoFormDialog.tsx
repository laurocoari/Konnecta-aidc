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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  loadPropostasAprovadas,
  loadModelosAtivos,
  createContractFromProposal,
} from "@/lib/contractService";
import { logger } from "@/lib/logger";
import { Loader2 } from "lucide-react";

interface ContratoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ContratoFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: ContratoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [propostaSelecionada, setPropostaSelecionada] = useState<string>("");
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");
  const [propostaData, setPropostaData] = useState<any>(null);
  const [modeloData, setModeloData] = useState<any>(null);
  const [formData, setFormData] = useState({
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      loadInitialData();
    } else {
      // Resetar ao fechar
      setPropostaSelecionada("");
      setModeloSelecionado("");
      setPropostaData(null);
      setModeloData(null);
      setFormData({
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        data_fim: "",
        observacoes: "",
      });
    }
  }, [open]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Carregar propostas e modelos em paralelo
      const [propostasData, modelosData] = await Promise.all([
        loadPropostasAprovadas(),
        loadModelosAtivos(), // Carregar todos os modelos ativos inicialmente
      ]);

      setPropostas(propostasData);
      setModelos(modelosData);
      
      logger.db(`Carregados ${propostasData.length} propostas e ${modelosData.length} modelos`);
    } catch (error: any) {
      logger.error("CONTRACT", "Erro ao carregar dados iniciais", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handlePropostaChange = (propostaId: string) => {
    setPropostaSelecionada(propostaId);
    const proposta = propostas.find((p) => p.id === propostaId);
    setPropostaData(proposta);

    // Se a proposta mudou, resetar modelo se não for compatível
    if (proposta && modeloSelecionado) {
      const modelo = modelos.find((m) => m.id === modeloSelecionado);
      const tipoProposta = proposta.tipo_operacao?.split("_")[0];
      // Verificar compatibilidade: locacao pode usar comodato, venda pode usar venda
      const isCompatible = modelo && (
        modelo.tipo === tipoProposta ||
        (tipoProposta === "locacao" && modelo.tipo === "comodato") ||
        (tipoProposta === "venda" && modelo.tipo === "venda")
      );
      
      if (!isCompatible) {
        setModeloSelecionado("");
        setModeloData(null);
      }
    }
  };

  const handleModeloChange = (modeloId: string) => {
    setModeloSelecionado(modeloId);
    const modelo = modelos.find((m) => m.id === modeloId);
    setModeloData(modelo);

    // Se o modelo é de locação, calcular data fim baseado em período padrão (12 meses)
    if (modelo && modelo.tipo === "locacao" && formData.data_inicio && !formData.data_fim) {
      const inicio = new Date(formData.data_inicio);
      const fim = new Date(inicio);
      fim.setMonth(fim.getMonth() + 12);
      setFormData({ ...formData, data_fim: format(fim, "yyyy-MM-dd") });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propostaSelecionada) {
      toast.error("Selecione uma proposta aprovada");
      return;
    }

    if (!modeloSelecionado) {
      toast.error("Selecione um modelo de contrato");
      return;
    }

    if (!formData.data_inicio) {
      toast.error("Data de início é obrigatória");
      return;
    }

    setLoading(true);
    try {
      logger.info("CONTRACT", `Criando contrato a partir da proposta ${propostaSelecionada}`);

      const result = await createContractFromProposal({
        proposta_id: propostaSelecionada,
        modelo_id: modeloSelecionado,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim || null,
        observacoes: formData.observacoes || null,
      });

      toast.success(`Contrato ${result.numero} criado com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      logger.error("CONTRACT", "Erro ao criar contrato", error);
      toast.error("Erro ao criar contrato: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar modelos por tipo da proposta se houver
  // Permitir modelos compatíveis: locacao pode usar comodato, venda usa venda
  const modelosFiltrados = propostaData
    ? modelos.filter((m) => {
        const tipoProposta = propostaData.tipo_operacao?.split("_")[0];
        if (!tipoProposta) return true; // Se não tem tipo, mostrar todos
        
        // Mapear tipos compatíveis
        if (tipoProposta === "locacao") {
          return m.tipo === "locacao" || m.tipo === "comodato";
        }
        if (tipoProposta === "venda") {
          return m.tipo === "venda";
        }
        
        // Para outros tipos, usar correspondência exata
        return m.tipo === tipoProposta;
      })
    : modelos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Novo Contrato</DialogTitle>
            <DialogDescription>
              Selecione uma proposta aprovada e um modelo de contrato para gerar o contrato
            </DialogDescription>
          </DialogHeader>

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando dados...</span>
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              {/* Seleção de Proposta */}
              <div className="space-y-2">
                <Label htmlFor="proposta">Proposta Aprovada *</Label>
                <Select
                  value={propostaSelecionada}
                  onValueChange={handlePropostaChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma proposta aprovada" />
                  </SelectTrigger>
                  <SelectContent>
                    {propostas.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhuma proposta aprovada encontrada
                      </SelectItem>
                    ) : (
                      propostas.map((proposta) => (
                        <SelectItem key={proposta.id} value={proposta.id}>
                          {proposta.codigo} - {proposta.cliente?.nome || "Cliente"}
                          {" "}
                          (R$ {proposta.total_geral.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Modelo */}
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo de Contrato *</Label>
                <Select
                  value={modeloSelecionado}
                  onValueChange={handleModeloChange}
                  required
                  disabled={!propostaSelecionada}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo de contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelosFiltrados.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {propostaSelecionada
                          ? "Nenhum modelo compatível encontrado"
                          : "Nenhum modelo ativo disponível"}
                      </SelectItem>
                    ) : (
                      modelosFiltrados.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          {modelo.nome} ({modelo.tipo === "locacao" ? "Locação" : modelo.tipo === "venda" ? "Venda" : modelo.tipo === "comodato" ? "Comodato" : modelo.tipo === "servico" ? "Serviço" : modelo.tipo})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Pré-visualização dos Dados */}
              {(propostaData || modeloData) && (
                <Card className="p-4 space-y-4">
                  <h4 className="font-semibold">Dados que serão utilizados:</h4>

                  {propostaData && (
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Cliente: </span>
                        <span className="text-sm">
                          {propostaData.cliente?.nome || "N/A"}
                        </span>
                        {propostaData.cliente?.cnpj && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (CNPJ: {propostaData.cliente.cnpj})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium">Valor Total: </span>
                        <span className="text-sm font-semibold text-success">
                          R$ {propostaData.total_geral.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {modeloData && (
                    <div>
                      <span className="text-sm font-medium">Tipo: </span>
                      <Badge variant="outline" className="ml-2">
                        {modeloData.tipo === "locacao" ? "Locação" : modeloData.tipo === "venda" ? "Venda" : modeloData.tipo}
                      </Badge>
                    </div>
                  )}
                </Card>
              )}

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) =>
                      setFormData({ ...formData, data_inicio: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data Término</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) =>
                      setFormData({ ...formData, data_fim: e.target.value })
                    }
                    min={formData.data_inicio}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Condições especiais, reajustes, multas, etc."
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || loadingData}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingData || !propostaSelecionada || !modeloSelecionado}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Contrato"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

