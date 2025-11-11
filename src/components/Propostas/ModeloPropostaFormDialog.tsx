import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModeloPropostaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelo?: any;
  onSuccess: () => void;
}

export default function ModeloPropostaFormDialog({
  open,
  onOpenChange,
  modelo,
  onSuccess,
}: ModeloPropostaFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "venda",
    cabecalho_html: "",
    rodape_html: "",
    condicoes_comerciais: "",
    observacoes_internas: "",
    logotipo_secundario: "",
    status: "ativo",
  });

  useEffect(() => {
    if (modelo) {
      setFormData({
        nome: modelo.nome,
        tipo: modelo.tipo,
        cabecalho_html: modelo.cabecalho_html || "",
        rodape_html: modelo.rodape_html || "",
        condicoes_comerciais: modelo.condicoes_comerciais || "",
        observacoes_internas: modelo.observacoes_internas || "",
        logotipo_secundario: modelo.logotipo_secundario || "",
        status: modelo.status,
      });
    } else {
      setFormData({
        nome: "",
        tipo: "venda",
        cabecalho_html: "Prezados,\n\nSegue nossa proposta comercial conforme especificações abaixo.",
        rodape_html: "Validade da proposta: 30 dias.\nAgradecemos a preferência.",
        condicoes_comerciais: "",
        observacoes_internas: "",
        logotipo_secundario: "",
        status: "ativo",
      });
    }
  }, [modelo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Informe o nome do modelo");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const modeloData = {
        ...formData,
        created_by: user.id,
      };

      if (modelo) {
        const { error } = await supabase
          .from("proposal_templates")
          .update(modeloData)
          .eq("id", modelo.id);

        if (error) throw error;
        toast.success("Modelo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("proposal_templates")
          .insert(modeloData);

        if (error) throw error;
        toast.success("Modelo criado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {modelo ? "Editar Modelo" : "Novo Modelo de Proposta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
              <TabsTrigger value="textos">Textos</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] pr-4">
              <TabsContent value="geral" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome do Modelo *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Proposta de Locação RFID Padrão"
                      required
                    />
                  </div>

                  <div>
                    <Label>Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="locacao">Locação</SelectItem>
                        <SelectItem value="servico">Serviço</SelectItem>
                        <SelectItem value="projeto">Projeto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
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
                </div>
              </TabsContent>

              <TabsContent value="textos" className="space-y-4">
                <div>
                  <Label>Cabeçalho / Introdução</Label>
                  <Textarea
                    value={formData.cabecalho_html}
                    onChange={(e) =>
                      setFormData({ ...formData, cabecalho_html: e.target.value })
                    }
                    rows={6}
                    placeholder="Texto de introdução da proposta..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis disponíveis: {`{{cliente_nome}}, {{cliente_cnpj}}, {{data}}`}
                  </p>
                </div>

                <div>
                  <Label>Condições Comerciais</Label>
                  <Textarea
                    value={formData.condicoes_comerciais}
                    onChange={(e) =>
                      setFormData({ ...formData, condicoes_comerciais: e.target.value })
                    }
                    rows={5}
                    placeholder="Ex: Pagamento 30/60 dias, garantia de 12 meses..."
                  />
                </div>

                <div>
                  <Label>Rodapé</Label>
                  <Textarea
                    value={formData.rodape_html}
                    onChange={(e) =>
                      setFormData({ ...formData, rodape_html: e.target.value })
                    }
                    rows={4}
                    placeholder="Texto final da proposta..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis disponíveis: {`{{validade}}, {{numero_proposta}}, {{valor_total}}`}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <div>
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.observacoes_internas}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes_internas: e.target.value })
                    }
                    rows={4}
                    placeholder="Notas visíveis apenas para uso interno..."
                  />
                </div>

                <div>
                  <Label>Logotipo Secundário (URL)</Label>
                  <Input
                    value={formData.logotipo_secundario}
                    onChange={(e) =>
                      setFormData({ ...formData, logotipo_secundario: e.target.value })
                    }
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL de um logotipo adicional para exibir no PDF (opcional)
                  </p>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : modelo ? "Atualizar" : "Criar Modelo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
