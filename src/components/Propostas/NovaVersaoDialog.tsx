import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NovaVersaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: any;
  onSuccess: () => void;
}

export default function NovaVersaoDialog({
  open,
  onOpenChange,
  proposta,
  onSuccess,
}: NovaVersaoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [motivoRevisao, setMotivoRevisao] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivoRevisao.trim()) {
      toast.error("Informe o motivo da nova versão");
      return;
    }

    setLoading(true);

    try {
      // Buscar dados da proposta atual e itens
      const { data: propostaAtual, error: propostaError } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposta.id)
        .single();

      if (propostaError) throw propostaError;

      const { data: itensAtuais, error: itensError } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", proposta.id);

      if (itensError) throw itensError;

      // Calcular nova versão
      const novaVersao = propostaAtual.versao + 1;

      // Verificar se já existe uma proposta com o mesmo código e versão
      const { data: propostaExistente, error: checkError } = await supabase
        .from("proposals")
        .select("id")
        .eq("codigo", propostaAtual.codigo)
        .eq("versao", novaVersao)
        .maybeSingle();

      if (checkError) {
        console.error("Erro ao verificar versão existente:", checkError);
      }

      if (propostaExistente) {
        toast.error(
          `Já existe uma versão ${novaVersao} para a proposta ${propostaAtual.codigo}. Por favor, verifique o histórico de versões.`
        );
        setLoading(false);
        return;
      }

      // Marcar proposta atual como substituída
      await supabase
        .from("proposals")
        .update({ status: "substituida" })
        .eq("id", proposta.id);

      // Criar nova versão - construir objeto explicitamente sem usar spread
      // Isso evita incluir campos que não devem ser copiados (id, created_at, updated_at, etc.)
      const novaPropostaData: any = {
        codigo: propostaAtual.codigo, // Mesmo código
        versao: novaVersao, // Nova versão incrementada
        modelo_id: propostaAtual.modelo_id || null,
        cliente_id: propostaAtual.cliente_id,
        oportunidade_id: propostaAtual.oportunidade_id || null,
        vendedor_id: propostaAtual.vendedor_id,
        tipo_operacao: propostaAtual.tipo_operacao,
        data_proposta: propostaAtual.data_proposta,
        validade: propostaAtual.validade,
        introducao: propostaAtual.introducao || null,
        condicoes_comerciais: propostaAtual.condicoes_comerciais || {},
        observacoes_internas: propostaAtual.observacoes_internas || null,
        total_itens: propostaAtual.total_itens || 0,
        custo_total: propostaAtual.custo_total || 0,
        lucro_total: propostaAtual.lucro_total || 0,
        margem_percentual_total: propostaAtual.margem_percentual_total || 0,
        desconto_total: propostaAtual.desconto_total || 0,
        despesas_adicionais: propostaAtual.despesas_adicionais || 0,
        total_geral: propostaAtual.total_geral || 0,
        status: "rascunho", // Sempre começar como rascunho
        motivo_revisao: motivoRevisao,
        // Não incluir: id, created_at, updated_at, pdf_url, token_publico, link_publico, responsavel_comercial_id, variaveis_preenchidas, historico_alteracoes
      };

      const { data: novaProposta, error: novaPropostaError } = await supabase
        .from("proposals")
        .insert(novaPropostaData)
        .select()
        .single();

      if (novaPropostaError) {
        console.error("Erro ao criar nova versão:", novaPropostaError);
        throw novaPropostaError;
      }

      // Copiar itens para nova versão - construir objetos explicitamente
      if (itensAtuais && itensAtuais.length > 0) {
        const novosItens = itensAtuais.map((item: any) => {
          const itemData: any = {
            proposal_id: novaProposta.id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            total: item.total,
          };

          // Adicionar campos opcionais apenas se existirem
          if (item.product_id) itemData.product_id = item.product_id;
          if (item.fornecedor_id) itemData.fornecedor_id = item.fornecedor_id;
          if (item.codigo) itemData.codigo = item.codigo;
          if (item.unidade) itemData.unidade = item.unidade;
          if (item.custo_unitario != null) itemData.custo_unitario = item.custo_unitario;
          if (item.valor_unitario != null) itemData.valor_unitario = item.valor_unitario;
          if (item.desconto != null) itemData.desconto = item.desconto;
          if (item.margem != null) itemData.margem = item.margem;
          if (item.estoque != null) itemData.estoque = item.estoque;
          if (item.imagem_url) itemData.imagem_url = item.imagem_url;
          if (item.comissao_percentual != null) itemData.comissao_percentual = item.comissao_percentual;
          if (item.periodo_locacao_meses != null) itemData.periodo_locacao_meses = item.periodo_locacao_meses;
          if (item.lucro_subtotal != null) itemData.lucro_subtotal = item.lucro_subtotal;

          return itemData;
        });

        const { error: novosItensError } = await supabase
          .from("proposal_items")
          .insert(novosItens);

        if (novosItensError) {
          console.error("Erro ao copiar itens:", novosItensError);
          throw novosItensError;
        }
      }

      toast.success(`Nova versão v${novaVersao} criada com sucesso!`);
      onSuccess();
      onOpenChange(false);
      setMotivoRevisao("");
    } catch (error: any) {
      console.error("Erro ao criar nova versão:", error);
      const errorMessage = error.message || "Erro ao criar nova versão";
      
      // Mensagem mais específica para erro de constraint única
      if (error.code === "23505" || errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
        toast.error(
          `Já existe uma versão ${novaVersao} para a proposta ${propostaAtual?.codigo || proposta?.codigo}. Verifique o histórico de versões.`
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Versão</DialogTitle>
          <DialogDescription>
            A proposta atual será marcada como "Substituída" e uma nova versão será criada com os mesmos dados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Motivo da Revisão *</Label>
            <Textarea
              value={motivoRevisao}
              onChange={(e) => setMotivoRevisao(e.target.value)}
              placeholder="Ex: Cliente solicitou alteração de valores, mudança de produtos, ajuste técnico..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Nova Versão"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
