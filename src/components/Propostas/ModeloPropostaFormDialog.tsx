import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "./RichTextEditor";
import { CondicoesComerciaisEditor, CondicaoComercial } from "./CondicoesComerciaisEditor";
import { ModeloTemplatePreview } from "./ModeloTemplatePreview";
import { Upload, Eye } from "lucide-react";

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
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "venda",
    status: "ativo",
    // Dados da empresa
    empresa_nome: "Konnecta Consultoria",
    empresa_cnpj: "05.601.700/0001-55",
    empresa_endereco: "Rua Rio Ebro, Nº7, QD12",
    empresa_telefone: "(92) 3242-1311",
    empresa_email: "",
    empresa_logo_url: "",
    // Textos principais
    cabecalho_html: "",
    apresentacao_html: "",
    rodape_html: "",
    // Blocos de condições
    blocos_condicoes: [] as CondicaoComercial[],
    // Variáveis customizadas
    variaveis_customizadas: [] as Array<{ nome: string; tipo: string; valor_padrao: string }>,
    // Seções ativas
    secoes_ativas: {
      cabecalho: true,
      apresentacao: true,
      itens: true,
      resumo_financeiro: true,
      condicoes_comerciais: true,
      rodape: true,
    },
    // Visual
    css_personalizado: "",
    observacoes_internas: "",
  });

  useEffect(() => {
    if (modelo) {
      setFormData({
        nome: modelo.nome || "",
        tipo: modelo.tipo || "venda",
        status: modelo.status || "ativo",
        empresa_nome: modelo.empresa_nome || "Konnecta Consultoria",
        empresa_cnpj: modelo.empresa_cnpj || "05.601.700/0001-55",
        empresa_endereco: modelo.empresa_endereco || "Rua Rio Ebro, Nº7, QD12",
        empresa_telefone: modelo.empresa_telefone || "(92) 3242-1311",
        empresa_email: modelo.empresa_email || "",
        empresa_logo_url: modelo.empresa_logo_url || "",
        cabecalho_html: modelo.cabecalho_html || "",
        apresentacao_html: modelo.apresentacao_html || "",
        rodape_html: modelo.rodape_html || "",
        blocos_condicoes: modelo.blocos_configuraveis ? JSON.parse(JSON.stringify(modelo.blocos_configuraveis)) : [],
        variaveis_customizadas: modelo.variaveis_customizadas ? JSON.parse(JSON.stringify(modelo.variaveis_customizadas)) : [],
        secoes_ativas: modelo.secoes_ativas ? JSON.parse(JSON.stringify(modelo.secoes_ativas)) : {
          cabecalho: true,
          apresentacao: true,
          itens: true,
          resumo_financeiro: true,
          condicoes_comerciais: true,
          rodape: true,
        },
        css_personalizado: modelo.css_personalizado || "",
        observacoes_internas: modelo.observacoes_internas || "",
      });
    } else {
      setFormData({
        nome: "",
        tipo: "venda",
        status: "ativo",
        empresa_nome: "Konnecta Consultoria",
        empresa_cnpj: "05.601.700/0001-55",
        empresa_endereco: "Rua Rio Ebro, Nº7, QD12",
        empresa_telefone: "(92) 3242-1311",
        empresa_email: "",
        empresa_logo_url: "",
        cabecalho_html: "",
        apresentacao_html: "Prezados, segue proposta comercial conforme especificações abaixo.",
        rodape_html: "Validade da proposta: 30 dias.\nAgradecemos a preferência.",
        blocos_condicoes: [],
        variaveis_customizadas: [],
        secoes_ativas: {
          cabecalho: true,
          apresentacao: true,
          itens: true,
          resumo_financeiro: true,
          condicoes_comerciais: true,
          rodape: true,
        },
        css_personalizado: "",
        observacoes_internas: "",
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
        nome: formData.nome,
        tipo: formData.tipo,
        status: formData.status,
        // Dados da empresa
        empresa_nome: formData.empresa_nome,
        empresa_cnpj: formData.empresa_cnpj,
        empresa_endereco: formData.empresa_endereco,
        empresa_telefone: formData.empresa_telefone,
        empresa_email: formData.empresa_email,
        empresa_logo_url: formData.empresa_logo_url,
        // Textos
        cabecalho_html: formData.cabecalho_html,
        rodape_html: formData.rodape_html,
        // Estrutura
        blocos_configuraveis: formData.blocos_condicoes,
        variaveis_customizadas: formData.variaveis_customizadas,
        secoes_ativas: formData.secoes_ativas,
        css_personalizado: formData.css_personalizado,
        observacoes_internas: formData.observacoes_internas,
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
      console.error("Erro ao salvar modelo:", error);
      toast.error(error.message || "Erro ao salvar modelo");
    } finally {
      setLoading(false);
    }
  };

  const addCustomVariable = () => {
    setFormData({
      ...formData,
      variaveis_customizadas: [
        ...formData.variaveis_customizadas,
        { nome: `custom.var${formData.variaveis_customizadas.length + 1}`, tipo: "texto", valor_padrao: "" },
      ],
    });
  };

  const removeCustomVariable = (index: number) => {
    setFormData({
      ...formData,
      variaveis_customizadas: formData.variaveis_customizadas.filter((_, i) => i !== index),
    });
  };

  const updateCustomVariable = (index: number, updates: Partial<typeof formData.variaveis_customizadas[0]>) => {
    const updated = [...formData.variaveis_customizadas];
    updated[index] = { ...updated[index], ...updates };
    setFormData({ ...formData, variaveis_customizadas: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>
            {modelo ? "Editar Modelo" : "Novo Modelo de Proposta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="estrutura" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
              <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
              <TabsTrigger value="variaveis">Variáveis</TabsTrigger>
              <TabsTrigger value="visual">Visual</TabsTrigger>
              <TabsTrigger value="geral">Geral</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[65vh] pr-4">
              <TabsContent value="estrutura" className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Seções Ativas
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(formData.secoes_ativas).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`secao-${key}`}
                          checked={value}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              secoes_ativas: {
                                ...formData.secoes_ativas,
                                [key]: checked as boolean,
                              },
                            })
                          }
                        />
                        <Label
                          htmlFor={`secao-${key}`}
                          className="text-sm font-normal cursor-pointer capitalize"
                        >
                          {key.replace(/_/g, " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Blocos de Condições Comerciais
                  </Label>
                  <CondicoesComerciaisEditor
                    blocos={formData.blocos_condicoes}
                    onChange={(blocos) => setFormData({ ...formData, blocos_condicoes: blocos })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="conteudo" className="space-y-4">
                <div>
                  <Label>Cabeçalho</Label>
                  <RichTextEditor
                    value={formData.cabecalho_html}
                    onChange={(value) => setFormData({ ...formData, cabecalho_html: value })}
                    placeholder="Conteúdo do cabeçalho da proposta..."
                  />
                </div>

                <div>
                  <Label>Apresentação / Introdução</Label>
                  <RichTextEditor
                    value={formData.apresentacao_html}
                    onChange={(value) => setFormData({ ...formData, apresentacao_html: value })}
                    placeholder="Texto de apresentação da proposta..."
                  />
                </div>

                <div>
                  <Label>Rodapé</Label>
                  <RichTextEditor
                    value={formData.rodape_html}
                    onChange={(value) => setFormData({ ...formData, rodape_html: value })}
                    placeholder="Conteúdo do rodapé..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="variaveis" className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Variáveis Customizadas
                  </Label>
                  <Button type="button" onClick={addCustomVariable} size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Variável
                  </Button>
                </div>

                {formData.variaveis_customizadas.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <p>Nenhuma variável customizada. Clique em "Adicionar Variável" para criar.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {formData.variaveis_customizadas.map((variavel, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Nome da Variável</Label>
                            <Input
                              value={variavel.nome}
                              onChange={(e) =>
                                updateCustomVariable(index, { nome: e.target.value })
                              }
                              placeholder="custom.observacao"
                            />
                          </div>
                          <div>
                            <Label>Tipo</Label>
                            <Select
                              value={variavel.tipo}
                              onValueChange={(value) =>
                                updateCustomVariable(index, { tipo: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="texto">Texto</SelectItem>
                                <SelectItem value="numero">Número</SelectItem>
                                <SelectItem value="data">Data</SelectItem>
                                <SelectItem value="moeda">Moeda</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Valor Padrão</Label>
                            <div className="flex gap-2">
                              <Input
                                value={variavel.valor_padrao}
                                onChange={(e) =>
                                  updateCustomVariable(index, { valor_padrao: e.target.value })
                                }
                                placeholder="Valor padrão"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCustomVariable(index)}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="visual" className="space-y-4">
                <div>
                  <Label>Logo da Empresa (URL)</Label>
                  <Input
                    value={formData.empresa_logo_url}
                    onChange={(e) => setFormData({ ...formData, empresa_logo_url: e.target.value })}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>

                <div>
                  <Label>CSS Personalizado</Label>
                  <Textarea
                    value={formData.css_personalizado}
                    onChange={(e) => setFormData({ ...formData, css_personalizado: e.target.value })}
                    rows={10}
                    placeholder="/* CSS customizado para o modelo */"
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? "Ocultar" : "Mostrar"} Preview
                  </Button>
                </div>

                {showPreview && (
                  <ModeloTemplatePreview
                    modelo={formData}
                    onClose={() => setShowPreview(false)}
                  />
                )}
              </TabsContent>

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
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Dados da Empresa</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Nome da Empresa</Label>
                      <Input
                        value={formData.empresa_nome}
                        onChange={(e) => setFormData({ ...formData, empresa_nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input
                        value={formData.empresa_cnpj}
                        onChange={(e) => setFormData({ ...formData, empresa_cnpj: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Endereço</Label>
                      <Input
                        value={formData.empresa_endereco}
                        onChange={(e) => setFormData({ ...formData, empresa_endereco: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={formData.empresa_telefone}
                        onChange={(e) => setFormData({ ...formData, empresa_telefone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={formData.empresa_email}
                        onChange={(e) => setFormData({ ...formData, empresa_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.observacoes_internas}
                    onChange={(e) => setFormData({ ...formData, observacoes_internas: e.target.value })}
                    rows={4}
                    placeholder="Notas visíveis apenas para uso interno..."
                  />
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
