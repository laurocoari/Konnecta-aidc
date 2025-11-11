import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Save, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import ROIChart from "./ROIChart";

interface SimuladorROIProps {
  propostaId?: string;
  investimentoInicial?: number;
  modo?: 'inline' | 'standalone';
  onSalvar?: (simulacao: any) => void;
}

export default function SimuladorROI({
  propostaId,
  investimentoInicial = 0,
  modo = 'standalone',
  onSalvar,
}: SimuladorROIProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    investimento_total: investimentoInicial,
    custo_operacional_mensal: 0,
    prazo_roi_meses: 12,
    duracao_contrato_meses: 36,
    lucro_mensal_estimado: 0,
    nome_simulacao: "",
    observacoes: "",
  });

  useEffect(() => {
    if (investimentoInicial > 0) {
      setFormData(prev => ({ ...prev, investimento_total: investimentoInicial }));
    }
  }, [investimentoInicial]);

  const calcularResultados = () => {
    const {
      investimento_total,
      custo_operacional_mensal,
      prazo_roi_meses,
      duracao_contrato_meses,
      lucro_mensal_estimado,
    } = formData;

    if (investimento_total <= 0 || prazo_roi_meses <= 0) {
      return null;
    }

    const retorno_mensal = investimento_total / prazo_roi_meses;
    const lucro_apos_roi = lucro_mensal_estimado - custo_operacional_mensal;
    const meses_apos_roi = duracao_contrato_meses - prazo_roi_meses;
    const lucro_total_contrato = meses_apos_roi > 0 ? lucro_apos_roi * meses_apos_roi : 0;
    const rentabilidade_percentual = investimento_total > 0 
      ? (lucro_total_contrato / investimento_total) * 100 
      : 0;

    return {
      retorno_mensal,
      lucro_apos_roi,
      lucro_total_contrato,
      rentabilidade_percentual,
      meses_apos_roi,
    };
  };

  const resultados = calcularResultados();

  const handleSalvar = async () => {
    if (!resultados) {
      toast.error("Preencha os campos corretamente para calcular o ROI");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const simulacaoData = {
        proposal_id: propostaId || null,
        ...formData,
        ...resultados,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("roi_simulations")
        .insert(simulacaoData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Simulação salva com sucesso!");
      
      if (onSalvar) {
        onSalvar(data);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar simulação");
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    setFormData({
      investimento_total: investimentoInicial,
      custo_operacional_mensal: 0,
      prazo_roi_meses: 12,
      duracao_contrato_meses: 36,
      lucro_mensal_estimado: 0,
      nome_simulacao: "",
      observacoes: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Entrada */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Dados da Simulação</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Investimento Total (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.investimento_total}
              onChange={(e) =>
                setFormData({ ...formData, investimento_total: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Custo Operacional Mensal (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.custo_operacional_mensal}
              onChange={(e) =>
                setFormData({ ...formData, custo_operacional_mensal: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Prazo para ROI (meses) *</Label>
            <Input
              type="number"
              min="1"
              value={formData.prazo_roi_meses}
              onChange={(e) =>
                setFormData({ ...formData, prazo_roi_meses: parseInt(e.target.value) || 1 })
              }
              placeholder="12"
            />
          </div>

          <div>
            <Label>Duração Total do Contrato (meses) *</Label>
            <Input
              type="number"
              min="1"
              value={formData.duracao_contrato_meses}
              onChange={(e) =>
                setFormData({ ...formData, duracao_contrato_meses: parseInt(e.target.value) || 1 })
              }
              placeholder="36"
            />
          </div>

          <div>
            <Label>Lucro Mensal Estimado (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.lucro_mensal_estimado}
              onChange={(e) =>
                setFormData({ ...formData, lucro_mensal_estimado: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Nome da Simulação (Opcional)</Label>
            <Input
              value={formData.nome_simulacao}
              onChange={(e) =>
                setFormData({ ...formData, nome_simulacao: e.target.value })
              }
              placeholder="Ex: Cenário Otimista"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Observações (Opcional)</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Notas sobre esta simulação..."
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Alertas */}
      {resultados && (
        <>
          {formData.prazo_roi_meses > formData.duracao_contrato_meses && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ O ROI não será alcançado dentro do período do contrato! 
                O prazo de ROI ({formData.prazo_roi_meses} meses) é maior que a duração do contrato ({formData.duracao_contrato_meses} meses).
              </AlertDescription>
            </Alert>
          )}

          {resultados.rentabilidade_percentual < 20 && formData.prazo_roi_meses <= formData.duracao_contrato_meses && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                💡 Rentabilidade abaixo de 20%. Considere ajustar os valores para melhorar o retorno do investimento.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Resultados */}
      {resultados && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Resultados da Simulação</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">💰 Investimento Total</p>
              <p className="text-2xl font-bold">{formatCurrency(formData.investimento_total)}</p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">📆 ROI Alcançado em</p>
              <p className="text-2xl font-bold">{formData.prazo_roi_meses} meses</p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">📈 Retorno Mensal Necessário</p>
              <p className="text-2xl font-bold">{formatCurrency(resultados.retorno_mensal)}</p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">💵 Lucro Mensal Após ROI</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(resultados.lucro_apos_roi)}
              </p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">🎯 Lucro Total no Período</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(resultados.lucro_total_contrato)}
              </p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">📊 Rentabilidade Total</p>
              <p className={`text-2xl font-bold ${
                resultados.rentabilidade_percentual >= 20 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {resultados.rentabilidade_percentual.toFixed(2)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Gráfico */}
      {resultados && formData.prazo_roi_meses <= formData.duracao_contrato_meses && (
        <ROIChart
          investimentoTotal={formData.investimento_total}
          prazoROI={formData.prazo_roi_meses}
          duracaoContrato={formData.duracao_contrato_meses}
          retornoMensal={resultados.retorno_mensal}
          lucroAposROI={resultados.lucro_apos_roi}
        />
      )}

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleLimpar}
        >
          Limpar
        </Button>
        <Button
          type="button"
          onClick={handleSalvar}
          disabled={loading || !resultados}
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Simulação"}
        </Button>
      </div>
    </div>
  );
}
