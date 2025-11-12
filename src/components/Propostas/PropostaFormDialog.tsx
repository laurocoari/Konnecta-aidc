import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, Calculator } from "lucide-react";
import SimuladorROI from "@/components/Financeiro/SimuladorROI";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TipoOperacaoSelector } from "./TipoOperacaoSelector";
import { FinancialSummaryPanel } from "./FinancialSummaryPanel";
import { useProposalCalculations, calcularCustoLocacaoDireta, calcularValorComMargem } from "@/hooks/useProposalCalculations";

interface PropostaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta?: any;
  onSuccess: () => void;
}

interface ProposalItem {
  id?: string;
  product_id?: string;
  fornecedor_id?: string;
  descricao: string;
  codigo: string;
  unidade: string;
  quantidade: number;
  custo_unitario: number;
  valor_unitario: number;
  preco_unitario: number; // mantido para compatibilidade
  comissao_percentual?: number;
  periodo_locacao_meses?: number;
  desconto: number;
  total: number;
  margem?: number;
  estoque?: number;
  imagem_url?: string;
  vida_util_meses?: number;
}

export default function PropostaFormDialog({
  open,
  onOpenChange,
  proposta,
  onSuccess,
}: PropostaFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [searchProduto, setSearchProduto] = useState("");
  const [items, setItems] = useState<ProposalItem[]>([]);
  
  const [formData, setFormData] = useState({
    modelo_id: "",
    cliente_id: "",
    tipo_operacao: "venda_direta" as 'venda_direta' | 'venda_agenciada' | 'locacao_direta' | 'locacao_agenciada',
    data_proposta: new Date().toISOString().split('T')[0],
    validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    introducao: "Prezados, segue proposta comercial conforme especificações abaixo.",
    observacoes_internas: "",
    desconto_total: 0,
    despesas_adicionais: 0,
    status: "rascunho",
    condicoes_comerciais: {
      tipo: "nenhuma",
      parcelas: 1,
      forma_pagamento: "",
      prazo_entrega: "",
      garantia: "",
    },
  });

  useEffect(() => {
    if (open) {
      loadClientes();
      loadProdutos();
      loadFornecedores();
      loadModelos();
      if (proposta) {
        loadPropostaData();
      }
    }
  }, [open, proposta]);

  const loadClientes = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("nome");
    
    if (error) {
      toast.error("Erro ao carregar clientes");
      return;
    }
    setClientes(data || []);
  };

  const loadProdutos = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "ativo")
      .order("nome");
    
    if (error) {
      toast.error("Erro ao carregar produtos");
      return;
    }
    setProdutos(data || []);
  };

  const loadFornecedores = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("status", "ativo")
      .order("nome");
    
    if (error) {
      toast.error("Erro ao carregar fornecedores");
      return;
    }
    setFornecedores(data || []);
  };

  const loadModelos = async () => {
    const { data, error } = await supabase
      .from("proposal_templates")
      .select("*")
      .eq("status", "ativo")
      .order("nome");
    
    if (error) {
      toast.error("Erro ao carregar modelos");
      return;
    }
    setModelos(data || []);
  };

  const aplicarModelo = (modeloId: string) => {
    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo) return;

    setFormData({
      ...formData,
      modelo_id: modeloId,
      introducao: modelo.cabecalho_html || formData.introducao,
      condicoes_comerciais: modelo.condicoes_comerciais 
        ? {
            ...formData.condicoes_comerciais,
            forma_pagamento: modelo.condicoes_comerciais,
          }
        : formData.condicoes_comerciais,
    });

    toast.success(`Modelo "${modelo.nome}" aplicado!`);
  };

  const loadPropostaData = async () => {
    if (!proposta?.id) return;

    const { data: itemsData, error } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposta.id);

    if (error) {
      toast.error("Erro ao carregar itens da proposta");
      return;
    }

    setItems(itemsData || []);
    setFormData({
      modelo_id: proposta.modelo_id || "",
      cliente_id: proposta.cliente_id,
      tipo_operacao: proposta.tipo_operacao || "venda_direta",
      data_proposta: proposta.data_proposta,
      validade: proposta.validade,
      introducao: proposta.introducao,
      observacoes_internas: proposta.observacoes_internas || "",
      desconto_total: proposta.desconto_total || 0,
      despesas_adicionais: proposta.despesas_adicionais || 0,
      status: proposta.status,
      condicoes_comerciais: proposta.condicoes_comerciais || {
        tipo: "nenhuma",
        parcelas: 1,
        forma_pagamento: "",
        prazo_entrega: "",
        garantia: "",
      },
    });
  };

  const addProduto = (produto: any) => {
    const custoMedio = produto.custo_medio || 0;
    const isLocacao = formData.tipo_operacao.includes('locacao');
    
    let valorUnitario = 0;
    let custoUnitario = custoMedio;
    
    if (isLocacao) {
      // Para locação direta: usar valor de locação ou calcular
      if (formData.tipo_operacao === 'locacao_direta') {
        valorUnitario = produto.valor_locacao || 0;
        custoUnitario = calcularCustoLocacaoDireta(custoMedio, produto.vida_util_meses || 36);
      } else {
        // Para locação agenciada: aguardar input do usuário
        valorUnitario = 0;
        custoUnitario = 0;
      }
    } else {
      // Para venda direta: usar valor de venda
      if (formData.tipo_operacao === 'venda_direta') {
        valorUnitario = produto.valor_venda || 0;
        if (produto.margem_lucro_venda) {
          valorUnitario = calcularValorComMargem(custoMedio, produto.margem_lucro_venda);
        }
      } else {
        // Para venda agenciada: aguardar input do usuário
        valorUnitario = 0;
        custoUnitario = 0;
      }
    }

    const margem = custoUnitario > 0 ? ((valorUnitario - custoUnitario) / custoUnitario) * 100 : 0;

    const newItem: ProposalItem = {
      product_id: produto.id,
      descricao: produto.nome,
      codigo: produto.codigo,
      unidade: produto.unidade || "un",
      quantidade: 1,
      custo_unitario: custoUnitario,
      valor_unitario: valorUnitario,
      preco_unitario: valorUnitario, // compatibilidade
      comissao_percentual: produto.comissao_agenciamento_padrao || 0,
      periodo_locacao_meses: isLocacao ? 12 : undefined,
      desconto: 0,
      total: valorUnitario,
      margem: parseFloat(margem.toFixed(2)),
      estoque: produto.estoque_atual,
      imagem_url: produto.imagem_principal,
      vida_util_meses: produto.vida_util_meses || 36,
    };

    setItems([...items, newItem]);
    setSearchProduto("");
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalcular total
    if (field === "quantidade" || field === "valor_unitario" || field === "custo_unitario" || field === "desconto" || field === "periodo_locacao_meses" || field === "comissao_percentual") {
      const item = newItems[index];
      const isLocacao = formData.tipo_operacao.includes('locacao');
      const periodo = isLocacao ? (item.periodo_locacao_meses || 1) : 1;
      
      const subtotal = item.quantidade * item.valor_unitario * periodo;
      const desconto = (subtotal * item.desconto) / 100;
      item.total = subtotal - desconto;
      item.preco_unitario = item.valor_unitario; // manter compatibilidade
      
      // Recalcular margem
      if (item.custo_unitario > 0) {
        item.margem = ((item.valor_unitario - item.custo_unitario) / item.custo_unitario) * 100;
      }
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calcularTotais = () => {
    const totalItens = items.reduce((sum, item) => sum + item.total, 0);
    const totalGeral = totalItens - formData.desconto_total + formData.despesas_adicionais;
    return { totalItens, totalGeral };
  };

  const gerarCodigo = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .like("codigo", `KPROP-${year}-%`);

    const nextNumber = (count || 0) + 1;
    return `KPROP-${year}-${String(nextNumber).padStart(3, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast.error("Selecione um cliente");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    // Validar fornecedor para operações agenciadas
    if (formData.tipo_operacao.includes('agenciada')) {
      const temFornecedor = items.every(item => item.fornecedor_id);
      if (!temFornecedor) {
        toast.error("Selecione o fornecedor para todos os itens em operações agenciadas");
        return;
      }
    }

    // Validar período para locações
    if (formData.tipo_operacao.includes('locacao')) {
      const temPeriodo = items.every(item => item.periodo_locacao_meses && item.periodo_locacao_meses > 0);
      if (!temPeriodo) {
        toast.error("Defina o período de locação para todos os itens");
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular totais usando o hook
      const calculations = useProposalCalculations(items.map(item => ({
        product_id: item.product_id!,
        fornecedor_id: item.fornecedor_id,
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario,
        valor_unitario: item.valor_unitario,
        comissao_percentual: item.comissao_percentual,
        periodo_locacao_meses: item.periodo_locacao_meses,
      })), formData.tipo_operacao);

      const totalItens = calculations.valor_total;
      const custoTotal = calculations.custo_total;
      const lucroTotal = calculations.lucro_total;
      const margemTotal = calculations.margem_percentual;
      const totalGeral = totalItens - formData.desconto_total + formData.despesas_adicionais;

      const codigo = proposta?.codigo || await gerarCodigo();

      const proposalData = {
        codigo,
        versao: proposta?.versao || 1,
        modelo_id: formData.modelo_id || null,
        cliente_id: formData.cliente_id,
        vendedor_id: user.id,
        tipo_operacao: formData.tipo_operacao,
        data_proposta: formData.data_proposta,
        validade: formData.validade,
        introducao: formData.introducao,
        condicoes_comerciais: formData.condicoes_comerciais,
        observacoes_internas: formData.observacoes_internas,
        total_itens: totalItens,
        custo_total: custoTotal,
        lucro_total: lucroTotal,
        margem_percentual_total: margemTotal,
        desconto_total: formData.desconto_total,
        despesas_adicionais: formData.despesas_adicionais,
        total_geral: totalGeral,
        status: formData.status,
      };

      let proposalId = proposta?.id;

      if (proposta) {
        const { error } = await supabase
          .from("proposals")
          .update(proposalData)
          .eq("id", proposta.id);

        if (error) throw error;

        // Deletar itens antigos
        await supabase
          .from("proposal_items")
          .delete()
          .eq("proposal_id", proposta.id);
      } else {
        const { data, error } = await supabase
          .from("proposals")
          .insert(proposalData)
          .select()
          .single();

        if (error) throw error;
        proposalId = data.id;
      }

      // Inserir novos itens
      const itemsData = items.map(item => ({
        proposal_id: proposalId,
        product_id: item.product_id,
        fornecedor_id: item.fornecedor_id,
        descricao: item.descricao,
        codigo: item.codigo,
        unidade: item.unidade,
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario,
        valor_unitario: item.valor_unitario,
        preco_unitario: item.valor_unitario, // compatibilidade
        comissao_percentual: item.comissao_percentual,
        periodo_locacao_meses: item.periodo_locacao_meses,
        desconto: item.desconto,
        total: item.total,
        margem: item.margem,
        estoque: item.estoque,
        imagem_url: item.imagem_url,
        lucro_subtotal: (item.valor_unitario - item.custo_unitario) * item.quantidade * (item.periodo_locacao_meses || 1),
      }));

      const { error: itemsError } = await supabase
        .from("proposal_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success(proposta ? "Proposta atualizada!" : "Proposta criada!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const { totalItens, totalGeral } = calcularTotais();
  
  // Calcular usando o hook
  const calculations = useProposalCalculations(items.map(item => ({
    product_id: item.product_id!,
    fornecedor_id: item.fornecedor_id,
    quantidade: item.quantidade,
    custo_unitario: item.custo_unitario,
    valor_unitario: item.valor_unitario,
    comissao_percentual: item.comissao_percentual,
    periodo_locacao_meses: item.periodo_locacao_meses,
  })), formData.tipo_operacao);
  
  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchProduto.toLowerCase());
    
    // Filtrar por tipo de disponibilidade
    if (formData.tipo_operacao === 'venda_direta') {
      return matchesSearch && (p.tipo_disponibilidade === 'venda' || p.tipo_disponibilidade === 'ambos');
    } else if (formData.tipo_operacao === 'locacao_direta') {
      return matchesSearch && (p.tipo_disponibilidade === 'locacao' || p.tipo_disponibilidade === 'ambos');
    }
    
    return matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {proposta ? "Editar Proposta" : "Nova Proposta Comercial"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="cabecalho" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="condicoes">Condições</TabsTrigger>
              <TabsTrigger value="totais">Totais</TabsTrigger>
              <TabsTrigger value="roi">
                <Calculator className="h-4 w-4 mr-2" />
                ROI
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] pr-4">
              <TabsContent value="cabecalho" className="space-y-4">
                <TipoOperacaoSelector
                  value={formData.tipo_operacao}
                  onChange={(tipo) => setFormData({ ...formData, tipo_operacao: tipo })}
                  disabled={loading}
                />

                <div>
                  <Label>Selecionar Modelo (Opcional)</Label>
                  <Select
                    value={formData.modelo_id || undefined}
                    onValueChange={(value) => {
                      setFormData({ ...formData, modelo_id: value });
                      aplicarModelo(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um modelo pronto ou crie do zero" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelos.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          {modelo.nome} ({modelo.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aplicar modelo preenche automaticamente introdução e condições
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cliente_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data da Proposta</Label>
                    <Input
                      type="date"
                      value={formData.data_proposta}
                      onChange={(e) =>
                        setFormData({ ...formData, data_proposta: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Validade</Label>
                    <Input
                      type="date"
                      value={formData.validade}
                      onChange={(e) =>
                        setFormData({ ...formData, validade: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Status</Label>
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
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                        <SelectItem value="recusada">Recusada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Introdução</Label>
                  <Textarea
                    value={formData.introducao}
                    onChange={(e) =>
                      setFormData({ ...formData, introducao: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.observacoes_internas}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes_internas: e.target.value })
                    }
                    rows={3}
                    placeholder="Notas visíveis apenas para uso interno..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="itens" className="space-y-4">
                <FinancialSummaryPanel
                  valorTotal={calculations.valor_total}
                  custoTotal={calculations.custo_total}
                  lucroTotal={calculations.lucro_total}
                  margemPercentual={calculations.margem_percentual}
                />

                <Card className="p-4">
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produto por nome ou código..."
                        value={searchProduto}
                        onChange={(e) => setSearchProduto(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {searchProduto && (
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                      {filteredProdutos.map((produto) => (
                        <div
                          key={produto.id}
                          className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-accent"
                          onClick={() => addProduto(produto)}
                        >
                          <div className="flex items-center gap-2">
                            {produto.imagem_principal && (
                              <img
                                src={produto.imagem_principal}
                                alt={produto.nome}
                                className="h-8 w-8 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium">{produto.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {produto.codigo} | Estoque: {produto.estoque_atual}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold">
                            {produto.valor_venda ? (
                              `R$ ${produto.valor_venda.toFixed(2)}`
                            ) : (
                              <span className="text-muted-foreground text-sm">Sem preço</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <div className="space-y-2">
                  {items.map((item, index) => {
                    const isAgenciada = formData.tipo_operacao.includes('agenciada');
                    const isLocacao = formData.tipo_operacao.includes('locacao');
                    
                    return (
                      <Card key={index} className="p-4">
                        <div className="space-y-4">
                          {/* Linha 1: Descrição e Fornecedor (se agenciada) */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>Descrição</Label>
                              <Input
                                value={item.descricao}
                                onChange={(e) =>
                                  updateItem(index, "descricao", e.target.value)
                                }
                              />
                            </div>
                            {isAgenciada && (
                              <div>
                                <Label>Fornecedor *</Label>
                                <Select
                                  value={item.fornecedor_id}
                                  onValueChange={(value) =>
                                    updateItem(index, "fornecedor_id", value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o fornecedor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fornecedores.map((fornecedor) => (
                                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                        {fornecedor.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Linha 2: Campos numéricos */}
                          <div className="grid gap-4 md:grid-cols-5">
                            <div>
                              <Label>Quantidade</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) =>
                                  updateItem(index, "quantidade", parseInt(e.target.value))
                                }
                              />
                            </div>
                            <div>
                              <Label>Custo Unit.</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.custo_unitario}
                                onChange={(e) =>
                                  updateItem(index, "custo_unitario", parseFloat(e.target.value))
                                }
                              />
                            </div>
                            <div>
                              <Label>Valor Unit.</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.valor_unitario}
                                onChange={(e) =>
                                  updateItem(index, "valor_unitario", parseFloat(e.target.value))
                                }
                              />
                            </div>
                            {isAgenciada && (
                              <div>
                                <Label>Comissão (%)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.comissao_percentual || 0}
                                  onChange={(e) =>
                                    updateItem(index, "comissao_percentual", parseFloat(e.target.value))
                                  }
                                />
                              </div>
                            )}
                            {isLocacao && (
                              <div>
                                <Label>Período (meses) *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.periodo_locacao_meses || 12}
                                  onChange={(e) =>
                                    updateItem(index, "periodo_locacao_meses", parseInt(e.target.value))
                                  }
                                />
                              </div>
                            )}
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label>Total</Label>
                                <Input
                                  value={`R$ ${item.total.toFixed(2)}`}
                                  disabled
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Informações adicionais */}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {item.margem !== undefined && (
                              <span>Margem: {item.margem.toFixed(2)}%</span>
                            )}
                            {item.estoque !== undefined && !isAgenciada && (
                              <span>Estoque: {item.estoque}</span>
                            )}
                            {isLocacao && item.periodo_locacao_meses && (
                              <span>Total do Período: R$ {(item.valor_unitario * item.quantidade * item.periodo_locacao_meses).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="condicoes" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={formData.condicoes_comerciais.tipo}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          condicoes_comerciais: {
                            ...formData.condicoes_comerciais,
                            tipo: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma</SelectItem>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Parcelas</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.condicoes_comerciais.parcelas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condicoes_comerciais: {
                            ...formData.condicoes_comerciais,
                            parcelas: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Input
                      value={formData.condicoes_comerciais.forma_pagamento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condicoes_comerciais: {
                            ...formData.condicoes_comerciais,
                            forma_pagamento: e.target.value,
                          },
                        })
                      }
                      placeholder="Ex: Boleto, Cartão, PIX..."
                    />
                  </div>

                  <div>
                    <Label>Prazo de Entrega</Label>
                    <Input
                      value={formData.condicoes_comerciais.prazo_entrega}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condicoes_comerciais: {
                            ...formData.condicoes_comerciais,
                            prazo_entrega: e.target.value,
                          },
                        })
                      }
                      placeholder="Ex: 5 dias úteis"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Garantia</Label>
                    <Input
                      value={formData.condicoes_comerciais.garantia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condicoes_comerciais: {
                            ...formData.condicoes_comerciais,
                            garantia: e.target.value,
                          },
                        })
                      }
                      placeholder="Ex: 12 meses"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="totais" className="space-y-4">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg">Subtotal de Itens:</span>
                      <span className="text-lg font-semibold">
                        R$ {totalItens.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <Label>Desconto Total (R$):</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.desconto_total}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            desconto_total: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-40"
                      />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <Label>Outras Despesas (R$):</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.despesas_adicionais}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            despesas_adicionais: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-40"
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold">Total Geral:</span>
                        <span className="text-2xl font-bold text-primary">
                          R$ {totalGeral.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="roi" className="space-y-4">
                <SimuladorROI
                  propostaId={proposta?.id}
                  investimentoInicial={totalGeral}
                  modo="inline"
                />
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
              {loading ? "Salvando..." : proposta ? "Atualizar" : "Criar Proposta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
