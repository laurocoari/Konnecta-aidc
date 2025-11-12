import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface ClienteFormDialogProps {
  onSuccess?: () => void;
}

export function ClienteFormDialog({ onSuccess }: ClienteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    ie: "",
    tipo: "cliente",
    contato_principal: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      logger.db("Salvando novo cliente no banco de dados");
      logger.db(`Dados: ${JSON.stringify({ ...formData, cnpj: formData.cnpj.substring(0, 5) + "..." })}`);

      // Verificar se já existe cliente com o mesmo CNPJ
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("cnpj", formData.cnpj)
        .maybeSingle();

      if (existingClient) {
        toast.error("Já existe um cliente cadastrado com este CNPJ");
        logger.warn("DB", "Tentativa de cadastrar cliente com CNPJ duplicado", { cnpj: formData.cnpj });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .insert({
          nome: formData.nome,
          cnpj: formData.cnpj,
          ie: formData.ie || null,
          tipo: formData.tipo,
          contato_principal: formData.contato_principal,
          email: formData.email,
          telefone: formData.telefone,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado.toUpperCase(),
          cep: formData.cep,
          observacoes: formData.observacoes || null,
        })
        .select()
        .single();

      if (error) {
        logger.error("DB", "Erro ao salvar cliente", error);
        throw error;
      }

      logger.db(`✅ Cliente cadastrado com sucesso: ${data.id}`);
      toast.success("Cliente cadastrado com sucesso!");
      
      // Resetar formulário
      setFormData({
        nome: "",
        cnpj: "",
        ie: "",
        tipo: "cliente",
        contato_principal: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        observacoes: "",
      });
      
      setOpen(false);
      
      // Chamar callback para recarregar lista
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      logger.error("DB", "Erro ao cadastrar cliente", error);
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            <DialogDescription>
              Adicione um novo cliente ou prospect à sua base
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome / Razão Social *</Label>
                <Input 
                  id="nome" 
                  placeholder="Nome do cliente" 
                  required 
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input 
                  id="cnpj" 
                  placeholder="00.000.000/0000-00" 
                  required 
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input 
                  id="ie" 
                  placeholder="000.000.000.000"
                  value={formData.ie}
                  onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  required
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="potencial">Potencial</SelectItem>
                    <SelectItem value="revendedor">Revendedor</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contato">Contato Principal *</Label>
              <Input 
                id="contato" 
                placeholder="Nome do responsável" 
                required 
                value={formData.contato_principal}
                onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="contato@empresa.com" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input 
                  id="telefone" 
                  placeholder="(00) 00000-0000" 
                  required 
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo *</Label>
              <Input 
                id="endereco" 
                placeholder="Rua, número, bairro" 
                required 
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input 
                  id="cidade" 
                  placeholder="Cidade" 
                  required 
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Input 
                  id="estado" 
                  placeholder="UF" 
                  maxLength={2} 
                  required 
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input 
                  id="cep" 
                  placeholder="00000-000" 
                  required 
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre o cliente"
                rows={3}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setOpen(false);
                setFormData({
                  nome: "",
                  cnpj: "",
                  ie: "",
                  tipo: "cliente",
                  contato_principal: "",
                  email: "",
                  telefone: "",
                  endereco: "",
                  cidade: "",
                  estado: "",
                  cep: "",
                  observacoes: "",
                });
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
