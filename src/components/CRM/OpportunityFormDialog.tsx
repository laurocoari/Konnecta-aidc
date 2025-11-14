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

interface OpportunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: any;
  contact?: any;
  onSuccess: () => void;
}

export function OpportunityFormDialog({
  open,
  onOpenChange,
  opportunity,
  contact,
  onSuccess,
}: OpportunityFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    contact_id: "",
    nome: "",
    valor_estimado: "",
    probabilidade: "50",
    etapa: "proposta",
    status: "ativa",
  });

  useEffect(() => {
    if (open) {
      loadContacts();
      if (opportunity) {
        setFormData({
          contact_id: opportunity.contact_id || "",
          nome: opportunity.nome || "",
          valor_estimado: opportunity.valor_estimado?.toString() || "",
          probabilidade: opportunity.probabilidade?.toString() || "50",
          etapa: opportunity.etapa || "proposta",
          status: opportunity.status || "ativa",
        });
      } else {
        setFormData({
          contact_id: contact?.id || "",
          nome: "",
          valor_estimado: "",
          probabilidade: "50",
          etapa: "proposta",
          status: "ativa",
        });
      }
    }
  }, [open, opportunity, contact]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nome, empresa")
        .order("nome");

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error loading contacts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        contact_id: formData.contact_id,
        valor_estimado: formData.valor_estimado
          ? parseFloat(formData.valor_estimado)
          : null,
        probabilidade: parseInt(formData.probabilidade),
        created_by: user?.id,
      };

      if (opportunity) {
        const { error } = await supabase
          .from("opportunities_crm")
          .update(dataToSave)
          .eq("id", opportunity.id);

        if (error) throw error;
        toast.success("Oportunidade atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("opportunities_crm")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Oportunidade criada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving opportunity:", error);
      toast.error(error.message || "Erro ao salvar oportunidade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {opportunity ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription>
            {opportunity
              ? "Atualize as informações da oportunidade"
              : "Crie uma nova oportunidade de venda"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_id">Contato *</Label>
            <Select
              value={formData.contact_id}
              onValueChange={(value) =>
                setFormData({ ...formData, contact_id: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um contato" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} {c.empresa ? `- ${c.empresa}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Oportunidade *</Label>
            <Input
              id="nome"
              placeholder="Ex: Venda de Sistema RFID"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor_estimado">Valor Estimado (R$)</Label>
              <Input
                id="valor_estimado"
                type="number"
                step="0.01"
                value={formData.valor_estimado}
                onChange={(e) =>
                  setFormData({ ...formData, valor_estimado: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilidade">Probabilidade (%)</Label>
              <Input
                id="probabilidade"
                type="number"
                min="0"
                max="100"
                value={formData.probabilidade}
                onChange={(e) =>
                  setFormData({ ...formData, probabilidade: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etapa">Etapa</Label>
              <Select
                value={formData.etapa}
                onValueChange={(value) =>
                  setFormData({ ...formData, etapa: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechamento">Fechamento</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="ganha">Ganha</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {loading ? "Salvando..." : opportunity ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


