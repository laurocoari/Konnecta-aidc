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

      // Marcar proposta atual como substituída
      await supabase
        .from("proposals")
        .update({ status: "substituida" })
        .eq("id", proposta.id);

      // Criar nova versão
      const novaVersao = propostaAtual.versao + 1;
      const { data: novaProposta, error: novaPropostaError } = await supabase
        .from("proposals")
        .insert({
          ...propostaAtual,
          id: undefined,
          versao: novaVersao,
          motivo_revisao: motivoRevisao,
          status: "rascunho",
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (novaPropostaError) throw novaPropostaError;

      // Copiar itens para nova versão
      const novosItens = itensAtuais.map((item: any) => ({
        ...item,
        id: undefined,
        proposal_id: novaProposta.id,
        created_at: undefined,
      }));

      const { error: novosItensError } = await supabase
        .from("proposal_items")
        .insert(novosItens);

      if (novosItensError) throw novosItensError;

      toast.success(`Nova versão v${novaVersao} criada com sucesso!`);
      onSuccess();
      onOpenChange(false);
      setMotivoRevisao("");
    } catch (error: any) {
      toast.error(error.message);
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
