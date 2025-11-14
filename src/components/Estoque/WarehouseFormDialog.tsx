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

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: any;
  onSuccess: () => void;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
  onSuccess,
}: WarehouseFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    localizacao: "",
    descricao: "",
    status: "ativo",
  });

  useEffect(() => {
    if (open) {
      if (warehouse) {
        setFormData({
          nome: warehouse.nome || "",
          localizacao: warehouse.localizacao || "",
          descricao: warehouse.descricao || "",
          status: warehouse.status || "ativo",
        });
      } else {
        setFormData({
          nome: "",
          localizacao: "",
          descricao: "",
          status: "ativo",
        });
      }
    }
  }, [open, warehouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (warehouse) {
        const { error } = await supabase
          .from("warehouses")
          .update(formData)
          .eq("id", warehouse.id);

        if (error) throw error;
        toast.success("Depósito atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("warehouses").insert(formData);

        if (error) throw error;
        toast.success("Depósito criado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving warehouse:", error);
      toast.error(error.message || "Erro ao salvar depósito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {warehouse ? "Editar Depósito" : "Novo Depósito"}
          </DialogTitle>
          <DialogDescription>
            {warehouse
              ? "Atualize os dados do depósito"
              : "Preencha os dados para criar um novo depósito"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Localização</Label>
            <Input
              value={formData.localizacao}
              onChange={(e) =>
                setFormData({ ...formData, localizacao: e.target.value })
              }
              placeholder="Ex: Setor A, Prateleira 3"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              rows={3}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
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
              {loading ? "Salvando..." : warehouse ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


