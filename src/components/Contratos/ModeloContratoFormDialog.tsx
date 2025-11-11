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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModeloContratoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelo?: any;
  onSuccess: () => void;
}

export function ModeloContratoFormDialog({
  open,
  onOpenChange,
  modelo,
  onSuccess,
}: ModeloContratoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "locacao" as "locacao" | "venda" | "comodato" | "servico",
    cabecalho_html: "",
    corpo_html: "",
    rodape_html: "",
    observacoes_internas: "",
    status: "ativo",
  });

  useEffect(() => {
    if (modelo) {
      setFormData({
        nome: modelo.nome || "",
        tipo: modelo.tipo || "locacao",
        cabecalho_html: modelo.cabecalho_html || "",
        corpo_html: modelo.corpo_html || "",
        rodape_html: modelo.rodape_html || "",
        observacoes_internas: modelo.observacoes_internas || "",
        status: modelo.status || "ativo",
      });
    } else {
      setFormData({
        nome: "",
        tipo: "locacao",
        cabecalho_html: `<div style="text-align: center; margin-bottom: 20px;">
  <h1>KONNECTA CONSULTORIA</h1>
  <p>Rua Rio Ebro Nº7, QD12, 69090-643 Manaus/AM</p>
  <p>Telefone: (92) 3242-1311 | CNPJ: 05.601.700/0001-55</p>
</div>`,
        corpo_html: `<h2>CONTRATO DE {{tipo}}</h2>

<p><strong>LOCADOR:</strong> KONNECTA CONSULTORIA</p>
<p><strong>CNPJ:</strong> 05.601.700/0001-55</p>

<p><strong>LOCATÁRIO:</strong> {{cliente_nome}}</p>
<p><strong>CNPJ:</strong> {{cliente_cnpj}}</p>
<p><strong>ENDEREÇO:</strong> {{cliente_endereco}}</p>

<h3>CLÁUSULA PRIMEIRA – DO OBJETO</h3>
<p>O presente contrato tem por objeto...</p>

<h3>CLÁUSULA SEGUNDA – DO PRAZO</h3>
<p>O prazo de vigência será de {{data_inicio}} a {{data_fim}}.</p>

<h3>CLÁUSULA TERCEIRA – DO VALOR</h3>
<p>O valor total do contrato é de R$ {{valor_total}}.</p>`,
        rodape_html: `<div style="margin-top: 40px; text-align: center;">
  <p>Manaus, {{data_assinatura}}</p>
  <div style="margin-top: 60px;">
    <div style="display: inline-block; width: 45%; text-align: center; border-top: 1px solid #000; margin: 0 10px;">
      <p><strong>LOCADOR</strong></p>
      <p>KONNECTA CONSULTORIA</p>
    </div>
    <div style="display: inline-block; width: 45%; text-align: center; border-top: 1px solid #000; margin: 0 10px;">
      <p><strong>LOCATÁRIO</strong></p>
      <p>{{cliente_nome}}</p>
    </div>
  </div>
</div>`,
        observacoes_internas: "",
        status: "ativo",
      });
    }
  }, [modelo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome do modelo é obrigatório");
      return;
    }

    if (!formData.corpo_html.trim()) {
      toast.error("Corpo do contrato é obrigatório");
      return;
    }

    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error("Usuário não autenticado");
      }

      if (modelo?.id) {
        const { error } = await supabase
          .from("contract_templates")
          .update({
            nome: formData.nome,
            tipo: formData.tipo,
            cabecalho_html: formData.cabecalho_html,
            corpo_html: formData.corpo_html,
            rodape_html: formData.rodape_html,
            observacoes_internas: formData.observacoes_internas,
            status: formData.status,
          })
          .eq("id", modelo.id);

        if (error) throw error;
        toast.success("Modelo atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("contract_templates").insert([{
          nome: formData.nome,
          tipo: formData.tipo,
          cabecalho_html: formData.cabecalho_html,
          corpo_html: formData.corpo_html,
          rodape_html: formData.rodape_html,
          observacoes_internas: formData.observacoes_internas,
          status: formData.status,
          created_by: user.user.id,
        }]);

        if (error) throw error;
        toast.success("Modelo criado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar modelo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {modelo ? "Editar Modelo de Contrato" : "Novo Modelo de Contrato"}
            </DialogTitle>
            <DialogDescription>
              Configure o modelo que será usado para gerar contratos automaticamente
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="geral" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
              <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Modelo *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Contrato de Locação - Padrão"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: "locacao" | "venda" | "comodato" | "servico") => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locacao">Locação</SelectItem>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="comodato">Comodato</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
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

            <TabsContent value="conteudo" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cabecalho">Cabeçalho HTML</Label>
                <Textarea
                  id="cabecalho"
                  rows={6}
                  placeholder="HTML do cabeçalho (logo, dados da empresa)"
                  value={formData.cabecalho_html}
                  onChange={(e) => setFormData({ ...formData, cabecalho_html: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="corpo">Corpo do Contrato * (HTML)</Label>
                <Textarea
                  id="corpo"
                  rows={12}
                  placeholder="Corpo principal do contrato com variáveis dinâmicas"
                  value={formData.corpo_html}
                  onChange={(e) => setFormData({ ...formData, corpo_html: e.target.value })}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {'{'}cliente_nome{'}'}, {'{'}cliente_cnpj{'}'}, {'{'}cliente_endereco{'}'}, {'{'}contrato_numero{'}'}, {'{'}data_inicio{'}'}, {'{'}data_fim{'}'}, {'{'}valor_total{'}'}, {'{'}valor_mensal{'}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rodape">Rodapé HTML</Label>
                <Textarea
                  id="rodape"
                  rows={6}
                  placeholder="HTML do rodapé (assinaturas, testemunhas)"
                  value={formData.rodape_html}
                  onChange={(e) => setFormData({ ...formData, rodape_html: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Internas</Label>
                <Textarea
                  id="observacoes"
                  rows={6}
                  placeholder="Notas internas sobre este modelo (não aparecem no contrato final)"
                  value={formData.observacoes_internas}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes_internas: e.target.value })
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : modelo ? "Atualizar" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}