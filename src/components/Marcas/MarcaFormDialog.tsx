import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

interface MarcaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marca?: any;
  onSuccess: () => void;
}

export function MarcaFormDialog({
  open,
  onOpenChange,
  marca,
  onSuccess,
}: MarcaFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    logo_url: "",
    descricao: "",
    status: "ativa",
    observacoes: "",
  });

  useEffect(() => {
    if (marca) {
      setFormData({
        nome: marca.nome || "",
        logo_url: marca.logo_url || "",
        descricao: marca.descricao || "",
        status: marca.status || "ativa",
        observacoes: marca.observacoes || "",
      });
    } else {
      setFormData({
        nome: "",
        logo_url: "",
        descricao: "",
        status: "ativa",
        observacoes: "",
      });
    }
  }, [marca, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (marca) {
        const { error } = await supabase
          .from("brands")
          .update(formData)
          .eq("id", marca.id);

        if (error) throw error;
        toast.success("Marca atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("brands").insert(formData);

        if (error) throw error;
        toast.success("Marca cadastrada com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving brand:", error);
      toast.error(error.message || "Erro ao salvar marca");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{marca ? "Editar Marca" : "Nova Marca"}</DialogTitle>
          <DialogDescription>
            Preencha os dados da marca
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Marca *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">URL do Logo</Label>
            <Input
              id="logo_url"
              value={formData.logo_url}
              onChange={(e) =>
                setFormData({ ...formData, logo_url: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Breve descrição da marca"
              rows={2}
            />
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
                <SelectItem value="inativa">Inativa</SelectItem>
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
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
