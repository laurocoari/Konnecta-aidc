import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, Calculator, Building2, Mail, Phone, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SimuladorROI from "@/components/Financeiro/SimuladorROI";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { TipoOperacaoSelector } from "./TipoOperacaoSelector";
import { FinancialSummaryPanel } from "./FinancialSummaryPanel";
import { ResumoFinanceiroPanel } from "./ResumoFinanceiroPanel";
import { calcularCustoLocacaoDireta, calcularValorComMargem } from "@/hooks/useProposalCalculations";
import { logger } from "@/lib/logger";
import { createAccountsReceivableFromProposal } from "@/lib/proposalAccountsReceivableService";
import { createRentalReceiptFromProposal } from "@/lib/rentalReceiptService";
import { SelecionarCotacoesDialog } from "./SelecionarCotacoesDialog";
import { ItensCotacoesSelecionadas, ItemSelecionado } from "./ItensCotacoesSelecionadas";
import { CotacaoCompleta } from "@/lib/cotacoesService";
import { searchProductsInSupabase } from "@/lib/supabaseProductSearch";
import { TabelaItensProposta } from "./TabelaItensProposta";
import { DialogAdicionarProduto } from "./DialogAdicionarProduto";

interface PropostaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta?: any;
  onSuccess: (salesOrderCreated?: any) => void;
}

export interface ProposalItem {
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
  // Campos de origem da cotação
  cotacao_id?: string;
  cotacao_item_id?: string;
  cotacao_numero?: string;
  custo_origem?: number;
  moeda_origem?: string;
  taxa_cambio_origem?: number | null;
  fornecedor_origem_id?: string;
  // Novos campos para auditoria completa
  valor_original_unitario?: number;
  valor_convertido_brl?: number;
  valor_convertido_usd?: number;
  valor_escolhido_para_proposta?: number;
  moeda_escolhida?: string;
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
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [searchProduto, setSearchProduto] = useState("");
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [produtosBuscaSupabase, setProdutosBuscaSupabase] = useState<any[]>([]);
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [dialogAdicionarProdutoOpen, setDialogAdicionarProdutoOpen] = useState(false);
  
  // Estados para integração com cotações
  const [selecionarCotacoesDialogOpen, setSelecionarCotacoesDialogOpen] = useState(false);
  const [itensCotacoesDialogOpen, setItensCotacoesDialogOpen] = useState(false);
  const [cotacoesSelecionadas, setCotacoesSelecionadas] = useState<CotacaoCompleta[]>([]);
  
  const [formData, setFormData] = useState({
    modelo_id: "",
    cliente_id: "",
    oportunidade_id: "",
    tipo_operacao: "venda_direta" as 'venda_direta' | 'venda_agenciada' | 'locacao_direta' | 'locacao_agenciada',
    data_proposta: new Date().toISOString().split('T')[0],
    validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    introducao: "Prezados, segue proposta comercial conforme especificações abaixo.",
    observacoes_internas: "",
    desconto_total: 0,
    despesas_adicionais: 0,
    status: "rascunho",
    gerar_contas_receber: false,
    condicoes_comerciais: {
      tipo: "nenhuma",
      parcelas: 1,
      acrescimo_percentual: 0,
      forma_pagamento: "",
      prazo_entrega: "",
      garantia: "",
      prazo_locacao_meses: 12,
      prazo_inicio_contrato: "",
      prazo_fim_contrato: "",
    },
  });

  useEffect(() => {
    if (open) {
      logger.ui("Abrindo formulário de proposta - carregando dados do banco");
      loadClientes();
      loadProdutos();
      loadFornecedores();
      loadModelos();
      if (proposta) {
        logger.ui(`Carregando dados da proposta existente: ${proposta.codigo || proposta.id}`);
        loadPropostaData();
      } else {
        // Resetar formulário para nova proposta
        setFormData({
          modelo_id: "",
          cliente_id: "",
          oportunidade_id: "",
          tipo_operacao: "venda_direta",
          data_proposta: new Date().toISOString().split('T')[0],
          validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          introducao: "Prezados, segue proposta comercial conforme especificações abaixo.",
          observacoes_internas: "",
          desconto_total: 0,
          despesas_adicionais: 0,
          status: "rascunho",
          gerar_contas_receber: false,
          condicoes_comerciais: {
            tipo: "nenhuma",
            parcelas: 1,
            acrescimo_percentual: 0,
            forma_pagamento: "",
            prazo_entrega: "",
            garantia: "",
            prazo_locacao_meses: 12,
            prazo_inicio_contrato: "",
            prazo_fim_contrato: "",
          },
        });
        setItems([]);
        setSelectedCliente(null);
        setOportunidades([]);
      }
    }
  }, [open, proposta]);

  // Carregar oportunidades quando cliente for selecionado
  useEffect(() => {
    if (formData.cliente_id) {
      loadOportunidades(formData.cliente_id);
      // Buscar dados completos do cliente selecionado
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      setSelectedCliente(cliente || null);
    } else {
      setOportunidades([]);
      setSelectedCliente(null);
    }
  }, [formData.cliente_id, clientes]);

  const loadClientes = async () => {
    try {
      logger.db("Carregando clientes do banco de dados");
      
      // Verificar autenticação primeiro
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error("AUTH", "Usuário não autenticado", authError);
        toast.error("Usuário não autenticado. Faça login novamente.");
        return;
      }
      
      logger.db(`Usuário autenticado: ${user.email} (${user.id})`);
      
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          origin_partner:partners!clients_origin_partner_id_fkey(
            id,
            nome_fantasia,
            razao_social
          ),
          exclusive_partner:partners!clients_exclusive_partner_id_fkey(
            id,
            nome_fantasia,
            razao_social
          )
        `)
        .order("nome");
      
      if (error) {
        logger.error("DB", "Erro ao carregar clientes", error);
        
        // Mensagem mais específica baseada no erro
        if (error.code === 'PGRST116' || error.message.includes('permission denied') || error.message.includes('row-level security')) {
          toast.error("Sem permissão para visualizar clientes. Verifique seu perfil de acesso.");
          logger.warn("DB", "Possível problema de RLS - usuário pode não ter role adequado");
        } else {
          toast.error("Erro ao carregar clientes: " + error.message);
        }
        return;
      }
      
      logger.db(`✅ ${data?.length || 0} clientes carregados`);
      
      if (!data || data.length === 0) {
        logger.warn("DB", "Nenhum cliente encontrado na tabela");
        toast.info("Nenhum cliente cadastrado ainda. Cadastre clientes primeiro.");
      }
      
      setClientes(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar clientes", error);
      toast.error("Erro ao carregar clientes: " + (error.message || "Erro desconhecido"));
    }
  };

  const loadProdutos = async () => {
    try {
      logger.db("Carregando produtos ativos do banco de dados");
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          brand:brands(
            id,
            nome,
            logo_url
          )
        `)
        .eq("status", "ativo")
        .order("nome");
      
      if (error) {
        logger.error("DB", "Erro ao carregar produtos", error);
        toast.error("Erro ao carregar produtos: " + error.message);
        return;
      }
      
      logger.db(`✅ ${data?.length || 0} produtos ativos carregados`);
      setProdutos(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar produtos", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const loadFornecedores = async () => {
    try {
      logger.db("Carregando fornecedores ativos do banco de dados");
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("status", "ativo")
        .order("nome");
      
      if (error) {
        logger.error("DB", "Erro ao carregar fornecedores", error);
        toast.error("Erro ao carregar fornecedores: " + error.message);
        return;
      }
      
      logger.db(`✅ ${data?.length || 0} fornecedores ativos carregados`);
      setFornecedores(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar fornecedores", error);
      toast.error("Erro ao carregar fornecedores");
    }
  };

  const loadModelos = async () => {
    try {
      logger.db("Carregando modelos de proposta ativos do banco de dados");
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("status", "ativo")
        .order("nome");

      if (error) {
        logger.error("DB", "Erro ao carregar modelos", error);
        toast.error("Erro ao carregar modelos: " + error.message);
        return;
      }
      
      logger.db(`✅ ${data?.length || 0} modelos ativos carregados`);
      setModelos(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar modelos", error);
      toast.error("Erro ao carregar modelos");
    }
  };

  const loadOportunidades = async (clienteId: string) => {
    try {
      logger.db(`Carregando oportunidades do cliente: ${clienteId}`);
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          client:clients(
            id,
            nome,
            cnpj
          ),
          partner:partners(
            id,
            nome_fantasia,
            razao_social
          )
        `)
        .eq("client_id", clienteId)
        .in("status", ["em_analise", "aprovada", "em_negociacao"])
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("DB", "Erro ao carregar oportunidades", error);
        return;
      }
      
      logger.db(`✅ ${data?.length || 0} oportunidades carregadas para o cliente`);
      setOportunidades(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar oportunidades", error);
    }
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
    if (!proposta?.id) {
      logger.warn("UI", "Tentativa de carregar proposta sem ID");
      return;
    }

    try {
      logger.db(`Carregando proposta completa: ${proposta.id}`);
      
      // Carregar proposta completa com relacionamentos
      const { data: propostaData, error: propostaError } = await supabase
        .from("proposals")
        .select(`
          *,
          cliente:clients(*),
          modelo:proposal_templates(*),
          oportunidade:opportunities(*)
        `)
        .eq("id", proposta.id)
        .single();

      if (propostaError) {
        logger.error("DB", "Erro ao carregar proposta", propostaError);
        throw propostaError;
      }

      logger.db(`✅ Proposta carregada: ${propostaData?.codigo || propostaData?.id}`);
      logger.db(`Cliente: ${propostaData?.cliente?.nome || 'N/A'}`);
      logger.db(`Modelo: ${propostaData?.modelo?.nome || 'N/A'}`);

      // Carregar itens com produtos e fornecedores relacionados
      logger.db("Carregando itens da proposta com relacionamentos");
      const { data: itemsData, error: itemsError } = await supabase
        .from("proposal_items")
        .select(`
          *,
          product:products(
            id,
            codigo,
            nome,
            descricao,
            categoria,
            tipo,
            imagem_principal,
            valor_venda,
            valor_locacao,
            custo_medio,
            estoque_atual,
            tipo_disponibilidade,
            vida_util_meses,
            margem_lucro_venda,
            comissao_agenciamento_padrao,
            brand:brands(id, nome, logo_url)
          ),
          fornecedor:suppliers(
            id,
            nome,
            cnpj,
            email,
            telefone
          )
        `)
        .eq("proposal_id", proposta.id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        logger.error("DB", "Erro ao carregar itens da proposta", itemsError);
        toast.error("Erro ao carregar itens da proposta: " + itemsError.message);
        return;
      }

      logger.db(`✅ ${itemsData?.length || 0} itens carregados da proposta`);

      // Mapear itens com dados completos dos produtos
      const mappedItems: ProposalItem[] = (itemsData || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        fornecedor_id: item.fornecedor_id || undefined,
        descricao: item.descricao || item.product?.nome || "",
        // Sempre usar código interno do produto quando disponível
        codigo: item.product?.codigo || item.codigo || "",
        unidade: item.unidade || item.product?.unidade || "un",
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario || item.product?.custo_medio || 0,
        valor_unitario: item.valor_unitario || item.preco_unitario || 0,
        preco_unitario: item.preco_unitario || item.valor_unitario || 0,
        comissao_percentual: item.comissao_percentual || item.product?.comissao_agenciamento_padrao || 0,
        periodo_locacao_meses: item.periodo_locacao_meses,
        desconto: item.desconto || 0,
        total: item.total || 0,
        margem: item.margem,
        estoque: item.estoque || item.product?.estoque_atual,
        imagem_url: item.imagem_url || item.product?.imagem_principal,
        vida_util_meses: item.product?.vida_util_meses || 36,
      }));

      setItems(mappedItems);

      // Carregar dados do formulário
      const clienteId = propostaData?.cliente_id || proposta.cliente_id;
      const condicoesComerciais = propostaData?.condicoes_comerciais || proposta.condicoes_comerciais || {};
      setFormData({
        modelo_id: propostaData?.modelo_id || proposta.modelo_id || "",
        cliente_id: clienteId,
        oportunidade_id: propostaData?.oportunidade_id || proposta.oportunidade_id || "",
        tipo_operacao: propostaData?.tipo_operacao || proposta.tipo_operacao || "venda_direta",
        data_proposta: propostaData?.data_proposta || proposta.data_proposta,
        validade: propostaData?.validade || proposta.validade,
        introducao: propostaData?.introducao || proposta.introducao || "",
        observacoes_internas: propostaData?.observacoes_internas || proposta.observacoes_internas || "",
        desconto_total: propostaData?.desconto_total || proposta.desconto_total || 0,
        despesas_adicionais: propostaData?.despesas_adicionais || proposta.despesas_adicionais || 0,
        status: propostaData?.status || proposta.status,
        gerar_contas_receber: false, // Sempre false ao carregar, pois é uma ação de criação
        condicoes_comerciais: {
          tipo: condicoesComerciais.tipo || "nenhuma",
          parcelas: condicoesComerciais.parcelas || 1,
          acrescimo_percentual: condicoesComerciais.acrescimo_percentual || 0,
          forma_pagamento: condicoesComerciais.forma_pagamento || "",
          prazo_entrega: condicoesComerciais.prazo_entrega || "",
          garantia: condicoesComerciais.garantia || "",
          prazo_locacao_meses: condicoesComerciais.prazo_locacao_meses || 12,
          prazo_inicio_contrato: condicoesComerciais.prazo_inicio_contrato || "",
          prazo_fim_contrato: condicoesComerciais.prazo_fim_contrato || "",
        },
      });

      // Carregar oportunidades do cliente se houver cliente_id
      if (clienteId) {
        logger.db(`Carregando oportunidades do cliente: ${clienteId}`);
        loadOportunidades(clienteId);
      }
      
      logger.ui("✅ Dados da proposta carregados com sucesso");
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar proposta", error);
      toast.error("Erro ao carregar dados da proposta: " + error.message);
    }
  };

  const handleProdutoClick = (produto: any) => {
    setProdutoSelecionado(produto);
    setDialogAdicionarProdutoOpen(true);
  };

  const handleConfirmarAdicionarProduto = (quantidade: number, precoUnitario: number, desconto: number) => {
    if (!produtoSelecionado) return;

    logger.ui(`Adicionando produto à proposta: ${produtoSelecionado.nome} (${produtoSelecionado.codigo})`);
    
    const custoMedio = produtoSelecionado.custo_medio || 0;
    const isLocacao = formData.tipo_operacao.includes('locacao');
    
    let custoUnitario = custoMedio;
    
    if (isLocacao && formData.tipo_operacao === 'locacao_direta') {
      custoUnitario = calcularCustoLocacaoDireta(custoMedio, produtoSelecionado.vida_util_meses || 36);
    }

    // Calcular subtotal com desconto
    const periodo = isLocacao ? (formData.condicoes_comerciais.prazo_locacao_meses || 12) : 1;
    const subtotal = quantidade * precoUnitario * periodo;
    const descontoValor = (subtotal * desconto) / 100;
    const total = subtotal - descontoValor;

    // Calcular margem (limitada a DECIMAL(5,2) = máximo 999.99)
    let margem = 0;
    if (custoUnitario > 0) {
      margem = ((precoUnitario - custoUnitario) / custoUnitario) * 100;
      // Limitar a 999.99% (limite do DECIMAL(5,2))
      margem = Math.min(Math.max(margem, -999.99), 999.99);
      margem = parseFloat(margem.toFixed(2));
    }

    const newItem: ProposalItem = {
      product_id: produtoSelecionado.id,
      descricao: produtoSelecionado.nome || produtoSelecionado.descricao || "",
      codigo: produtoSelecionado.codigo || "",
      unidade: produtoSelecionado.unidade || "un",
      quantidade: quantidade,
      custo_unitario: custoUnitario,
      valor_unitario: precoUnitario,
      preco_unitario: precoUnitario, // compatibilidade
      comissao_percentual: produtoSelecionado.comissao_agenciamento_padrao || 0,
      periodo_locacao_meses: isLocacao ? periodo : undefined,
      desconto: desconto,
      total: total,
      margem: margem,
      estoque: produtoSelecionado.estoque_atual,
      imagem_url: produtoSelecionado.imagem_principal,
      vida_util_meses: produtoSelecionado.vida_util_meses || 36,
    };

    logger.ui(`✅ Item adicionado: ${newItem.descricao}, Total: R$ ${newItem.total.toFixed(2)}`);
    setItems([...items, newItem]);
    setSearchProduto("");
    setProdutoSelecionado(null);
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
      
      // Recalcular margem (limitada a DECIMAL(5,2) = máximo 999.99)
      if (item.custo_unitario > 0) {
        let margem = ((item.valor_unitario - item.custo_unitario) / item.custo_unitario) * 100;
        // Limitar a 999.99% (limite do DECIMAL(5,2))
        margem = Math.min(Math.max(margem, -999.99), 999.99);
        item.margem = parseFloat(margem.toFixed(2));
      } else {
        item.margem = 0;
      }
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Handlers para integração com cotações
  const handleSelecionarCotacoes = () => {
    setSelecionarCotacoesDialogOpen(true);
  };

  const handleCotacoesSelecionadas = (cotacoes: CotacaoCompleta[]) => {
    setCotacoesSelecionadas(cotacoes);
    setSelecionarCotacoesDialogOpen(false);
    setItensCotacoesDialogOpen(true);
  };

  const handleImportarItensCotacoes = (itensSelecionados: ItemSelecionado[]) => {
    logger.ui(`Importando ${itensSelecionados.length} itens de cotações para a proposta`);
    
    const novosItens: ProposalItem[] = itensSelecionados.map((itemSelecionado) => {
      const { 
        cotacao, 
        item, 
        valorOriginal,
        valorConvertidoBRL,
        valorConvertidoUSD,
        valorEscolhido,
        moedaEscolhida,
        modoConversao
      } = itemSelecionado;
      
      // REGRA DE OURO: valorEscolhido é EXATAMENTE o valor mostrado em "Custo a usar"
      // Usar esse valor diretamente, sem recalcular nada
      const custoUnitario = valorEscolhido;
      
      // Log para validação
      if (process.env.NODE_ENV === 'development') {
        logger.ui(`[COTAÇÃO] Importando item: ${item.descricao}`, {
          valorOriginal,
          valorConvertidoBRL,
          valorConvertidoUSD,
          valorEscolhido,
          moedaEscolhida,
          modoConversao,
          quantidade: item.quantidade,
        });
      }
      
      // Calcular valor unitário inicial (pode ser ajustado pelo usuário depois)
      // Para agenciada, começar com o custo escolhido (sem margem inicial)
      let valorUnitario = custoUnitario;
      const isLocacao = formData.tipo_operacao.includes('locacao');
      
      // Se for locação agenciada, usar período padrão
      const periodoLocacao = isLocacao ? (formData.condicoes_comerciais.prazo_locacao_meses || 12) : 1;
      
      // Calcular margem inicial (0% por padrão para agenciada)
      let margem = 0;
      if (custoUnitario > 0 && valorUnitario > 0) {
        margem = ((valorUnitario - custoUnitario) / custoUnitario) * 100;
        margem = Math.min(Math.max(margem, -999.99), 999.99);
        margem = parseFloat(margem.toFixed(2));
      }
      
      // Calcular subtotal: quantidade * valor_unitario * período (se locação)
      const subtotal = item.quantidade * valorUnitario * periodoLocacao;
      
      const newItem: ProposalItem = {
        product_id: item.product_id || undefined,
        fornecedor_id: cotacao.supplier_id || undefined,
        descricao: item.descricao,
        codigo: item.part_number || item.descricao.substring(0, 20) || "",
        unidade: "un",
        quantidade: item.quantidade,
        // REGRA DE OURO: custo_unitario = valorEscolhido (exatamente o "Custo a usar")
        custo_unitario: custoUnitario,
        valor_unitario: valorUnitario,
        preco_unitario: valorUnitario, // compatibilidade
        comissao_percentual: 0, // Pode ser ajustado depois
        periodo_locacao_meses: isLocacao ? periodoLocacao : undefined,
        desconto: 0,
        total: subtotal,
        margem: margem,
        estoque: undefined,
        imagem_url: undefined,
        vida_util_meses: 36,
        // Campos de origem da cotação (auditoria completa)
        cotacao_id: cotacao.id,
        cotacao_item_id: item.id,
        cotacao_numero: cotacao.numero_cotacao,
        fornecedor_origem_id: cotacao.supplier_id,
        // Valores originais da cotação
        custo_origem: item.preco_unitario, // Mantido para compatibilidade
        valor_original_unitario: valorOriginal,
        moeda_origem: item.moeda || cotacao.moeda,
        taxa_cambio_origem: cotacao.taxa_cambio,
        // Valores convertidos
        valor_convertido_brl: valorConvertidoBRL,
        valor_convertido_usd: valorConvertidoUSD,
        // Valor escolhido e modo
        valor_escolhido_para_proposta: valorEscolhido,
        moeda_escolhida: moedaEscolhida,
      };
      
      // Log final para validação
      if (process.env.NODE_ENV === 'development') {
        logger.ui(`[COTAÇÃO] Item criado: ${newItem.descricao}`, {
          custo_unitario: newItem.custo_unitario,
          valor_original_unitario: newItem.valor_original_unitario,
          valor_convertido_brl: newItem.valor_convertido_brl,
          valor_convertido_usd: newItem.valor_convertido_usd,
          valor_escolhido_para_proposta: newItem.valor_escolhido_para_proposta,
          moeda_escolhida: newItem.moeda_escolhida,
        });
      }
      
      return newItem;
    });
    
    setItems([...items, ...novosItens]);
    setItensCotacoesDialogOpen(false);
    setCotacoesSelecionadas([]);
    toast.success(`${itensSelecionados.length} item(ns) importado(s) da(s) cotação(ões)`);
  };

  const calcularTotais = () => {
    const totalItens = items.reduce((sum, item) => sum + item.total, 0);
    let totalGeral = totalItens - formData.desconto_total + formData.despesas_adicionais;
    
    // Aplicar acréscimo se for parcelado
    if (formData.condicoes_comerciais.tipo === "parcelado" && formData.condicoes_comerciais.acrescimo_percentual > 0) {
      const acrescimo = (totalGeral * formData.condicoes_comerciais.acrescimo_percentual) / 100;
      totalGeral = totalGeral + acrescimo;
    }
    
    return { totalItens, totalGeral };
  };
  
  // Calcular valor da parcela
  const calcularValorParcela = () => {
    const { totalGeral } = calcularTotais();
    const parcelas = formData.condicoes_comerciais.parcelas || 1;
    return totalGeral / parcelas;
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

      // Validar datas de contrato (obrigatórias para locação)
      if (!formData.condicoes_comerciais.prazo_inicio_contrato || !formData.condicoes_comerciais.prazo_fim_contrato) {
        toast.error("Informe o prazo inicial e final do contrato para propostas de locação");
        return;
      }

      // Validar que data final é posterior à data inicial
      const inicio = new Date(formData.condicoes_comerciais.prazo_inicio_contrato);
      const fim = new Date(formData.condicoes_comerciais.prazo_fim_contrato);
      if (fim <= inicio) {
        toast.error("A data final do contrato deve ser posterior à data inicial");
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular totais manualmente (hook não pode ser usado dentro de função)
      const calculations = items.map(item => {
        const periodo = item.periodo_locacao_meses || 1;
        let valor_subtotal = 0;
        let custo_subtotal = 0;
        
        if (formData.tipo_operacao.includes('locacao')) {
          valor_subtotal = item.valor_unitario * item.quantidade * periodo;
          custo_subtotal = item.custo_unitario * item.quantidade * periodo;
        } else {
          valor_subtotal = item.valor_unitario * item.quantidade;
          custo_subtotal = item.custo_unitario * item.quantidade;
        }
        
        return { valor_subtotal, custo_subtotal };
      });
      
      const totalItens = calculations.reduce((sum, calc) => sum + calc.valor_subtotal, 0);
      const custoTotal = calculations.reduce((sum, calc) => sum + calc.custo_subtotal, 0);
      const lucroTotal = totalItens - custoTotal;
      
      // Margem sobre o custo (padrão comercial) - não sobre o valor de venda
      // Validar e limitar margem para DECIMAL(5,2) = máximo 999.99
      let margemTotal = 0;
      if (custoTotal > 0) {
        margemTotal = (lucroTotal / custoTotal) * 100;
        // Limitar a 999.99% (limite do DECIMAL(5,2))
        margemTotal = Math.min(Math.max(margemTotal, -999.99), 999.99);
        // Arredondar para 2 casas decimais
        margemTotal = Math.round(margemTotal * 100) / 100;
      }
      
      let totalGeral = totalItens - formData.desconto_total + formData.despesas_adicionais;
      
      // Aplicar acréscimo se for parcelado
      if (formData.condicoes_comerciais.tipo === "parcelado" && formData.condicoes_comerciais.acrescimo_percentual > 0) {
        const acrescimo = (totalGeral * formData.condicoes_comerciais.acrescimo_percentual) / 100;
        totalGeral = totalGeral + acrescimo;
      }

      const codigo = proposta?.codigo || await gerarCodigo();

      // Coletar IDs únicos das cotações usadas nos itens
      const cotacoesIds = Array.from(
        new Set(
          items
            .filter((item) => item.cotacao_id)
            .map((item) => item.cotacao_id!)
        )
      );

      // Arredondar todos os valores monetários para 2 casas decimais
      const proposalData = {
        codigo,
        versao: proposta?.versao || 1,
        modelo_id: formData.modelo_id && formData.modelo_id !== "" ? formData.modelo_id : null,
        cliente_id: formData.cliente_id,
        oportunidade_id: formData.oportunidade_id && formData.oportunidade_id !== "" ? formData.oportunidade_id : null,
        vendedor_id: user.id,
        tipo_operacao: formData.tipo_operacao,
        data_proposta: formData.data_proposta,
        validade: formData.validade,
        introducao: formData.introducao,
        condicoes_comerciais: formData.condicoes_comerciais,
        observacoes_internas: formData.observacoes_internas,
        total_itens: Math.round(totalItens * 100) / 100,
        custo_total: Math.round(custoTotal * 100) / 100,
        lucro_total: Math.round(lucroTotal * 100) / 100,
        margem_percentual_total: margemTotal,
        desconto_total: Math.round(formData.desconto_total * 100) / 100,
        despesas_adicionais: Math.round(formData.despesas_adicionais * 100) / 100,
        total_geral: Math.round(totalGeral * 100) / 100,
        status: formData.status,
        cotacoes_ids: cotacoesIds.length > 0 ? cotacoesIds : null,
      };

      let proposalId = proposta?.id;
      const wasApproved = proposta?.status !== 'aprovada' && formData.status === 'aprovada';

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

      // Função helper para limpar UUID vazio
      const cleanUUID = (value: any): string | null => {
        if (!value || value === "" || value === "null" || value === "undefined") {
          return null;
        }
        return value;
      };

      // Função helper para validar e limitar valores DECIMAL(5,2)
      const limitDecimal52 = (value: number | undefined | null): number | null => {
        if (value === undefined || value === null) return null;
        // Limitar a -999.99 a 999.99 (limite do DECIMAL(5,2))
        const limited = Math.min(Math.max(value, -999.99), 999.99);
        // Arredondar para 2 casas decimais
        return Math.round(limited * 100) / 100;
      };

      // Inserir novos itens
      const itemsData = items.map(item => {
        const periodo = item.periodo_locacao_meses || 1;
        const lucroSubtotal = (item.valor_unitario - item.custo_unitario) * item.quantidade * periodo;
        
        // Buscar código interno do produto se houver product_id
        let codigoInterno = item.codigo;
        if (item.product_id) {
          const produto = produtos.find(p => p.id === item.product_id);
          if (produto?.codigo) {
            codigoInterno = produto.codigo;
          }
        }
        
        return {
          proposal_id: proposalId,
          product_id: item.product_id ? cleanUUID(item.product_id) : null,
          fornecedor_id: item.fornecedor_id ? cleanUUID(item.fornecedor_id) : null,
          descricao: item.descricao,
          // Sempre salvar código interno do produto (não código do fornecedor)
          codigo: codigoInterno || "",
          unidade: item.unidade,
          quantidade: item.quantidade,
          custo_unitario: Math.round(item.custo_unitario * 100) / 100,
          valor_unitario: Math.round(item.valor_unitario * 100) / 100,
          preco_unitario: Math.round(item.valor_unitario * 100) / 100, // compatibilidade
          comissao_percentual: limitDecimal52(item.comissao_percentual),
          periodo_locacao_meses: item.periodo_locacao_meses,
          desconto: limitDecimal52(item.desconto) || 0,
          total: Math.round(item.total * 100) / 100,
          margem: limitDecimal52(item.margem),
          estoque: item.estoque,
          imagem_url: item.imagem_url,
          lucro_subtotal: Math.round(lucroSubtotal * 100) / 100,
          // Campos de origem da cotação (auditoria completa)
          cotacao_id: item.cotacao_id ? cleanUUID(item.cotacao_id) : null,
          cotacao_item_id: item.cotacao_item_id ? cleanUUID(item.cotacao_item_id) : null,
          cotacao_numero: item.cotacao_numero || null,
          fornecedor_origem_id: item.fornecedor_origem_id ? cleanUUID(item.fornecedor_origem_id) : null,
          // Valores originais da cotação
          custo_origem: item.custo_origem ? Math.round(item.custo_origem * 100) / 100 : null, // Mantido para compatibilidade
          valor_original_unitario: item.valor_original_unitario ? Math.round(item.valor_original_unitario * 100) / 100 : null,
          moeda_origem: item.moeda_origem || null,
          taxa_cambio_origem: item.taxa_cambio_origem ? Math.round(item.taxa_cambio_origem * 10000) / 10000 : null,
          // Valores convertidos
          valor_convertido_brl: item.valor_convertido_brl ? Math.round(item.valor_convertido_brl * 100) / 100 : null,
          valor_convertido_usd: item.valor_convertido_usd ? Math.round(item.valor_convertido_usd * 100) / 100 : null,
          // Valor escolhido e modo
          valor_escolhido_para_proposta: item.valor_escolhido_para_proposta ? Math.round(item.valor_escolhido_para_proposta * 100) / 100 : null,
          moeda_escolhida: item.moeda_escolhida || null,
        };
      });

      const { error: itemsError } = await supabase
        .from("proposal_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      logger.ui(`✅ Proposta ${proposta ? 'atualizada' : 'criada'} com sucesso: ${codigo}`);
      
      // Verificar se proposta foi aprovada (nova ou mudou status) e pedido foi criado automaticamente
      let salesOrderCreated = null;
      if (formData.status === 'aprovada' && proposalId && (!proposta || wasApproved)) {
        // Aguardar um pouco para o trigger executar
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Verificar se pedido foi criado
        const { data: salesOrderData } = await supabase
          .from("sales_orders")
          .select("id, numero_pedido")
          .eq("proposta_id", proposalId)
          .maybeSingle();
        
        if (salesOrderData) {
          salesOrderCreated = salesOrderData;
          toast.success(
            `Proposta aprovada! Pedido ${salesOrderData.numero_pedido} criado automaticamente.`,
            {
              duration: 5000,
            }
          );
        } else {
          // Se não encontrou, pode ser que o trigger ainda não executou
          // Tentar mais uma vez após um delay maior
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retryData } = await supabase
            .from("sales_orders")
            .select("id, numero_pedido")
            .eq("proposta_id", proposalId)
            .maybeSingle();
          
          if (retryData) {
            salesOrderCreated = retryData;
            toast.success(
              `Proposta aprovada! Pedido ${retryData.numero_pedido} criado automaticamente.`,
              {
                duration: 5000,
              }
            );
          }
        }
      } else {
        toast.success(proposta ? "Proposta atualizada!" : "Proposta criada!");
      }

      // Criar contas a receber se opção estiver marcada
      if (formData.gerar_contas_receber && proposalId) {
        try {
          // Para locação, usar meses do contrato; para venda, usar parcelas
          let parcelas = 1;
          if (formData.tipo_operacao.includes('locacao')) {
            parcelas = formData.condicoes_comerciais.prazo_locacao_meses || 1;
          } else {
            parcelas = formData.condicoes_comerciais.tipo === "parcelado" 
              ? formData.condicoes_comerciais.parcelas || 1 
              : 1;
          }
          
          const contasIds = await createAccountsReceivableFromProposal(proposalId, {
            valorTotal: totalGeral,
            parcelas: parcelas,
            dataEmissao: formData.data_proposta,
          });

          if (contasIds.length > 0) {
            toast.success(
              `${contasIds.length} conta(s) a receber criada(s) com sucesso!`,
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          logger.error("Erro ao criar contas a receber:", error);
          toast.error(`Erro ao criar contas a receber: ${error.message}`);
          // Não bloquear o fluxo se falhar a criação de contas
        }
      }

      // Gerar recibo de locação se proposta de locação foi aprovada
      if (
        formData.status === 'aprovada' &&
        proposalId &&
        (formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') &&
        (!proposta || wasApproved)
      ) {
        try {
          const recibo = await createRentalReceiptFromProposal(proposalId, {
            periodo_locacao_inicio: formData.condicoes_comerciais.prazo_inicio_contrato,
            periodo_locacao_fim: formData.condicoes_comerciais.prazo_fim_contrato,
            observacoes: `Recibo gerado automaticamente da proposta ${codigo}`,
          });

          toast.success(
            `Recibo de locação ${recibo.numero_recibo} criado automaticamente!`,
            { duration: 5000 }
          );
        } catch (error: any) {
          logger.error("Erro ao criar recibo de locação:", error);
          toast.error(`Erro ao criar recibo de locação: ${error.message}`);
          // Não bloquear o fluxo se falhar a criação do recibo
        }
      }
      
      // Passar informação do pedido criado para o callback
      onSuccess(salesOrderCreated);
      onOpenChange(false);
    } catch (error: any) {
      logger.error("DB", "Erro ao salvar proposta", error);
      toast.error(error.message || "Erro ao salvar proposta");
    } finally {
      setLoading(false);
    }
  };

  const { totalItens, totalGeral } = calcularTotais();
  
  // Calcular usando função auxiliar (hook não pode ser usado aqui)
  const calculations = (() => {
    const calcItems = items.map(item => {
      const periodo = item.periodo_locacao_meses || 1;
      let valor_subtotal_bruto = 0;
      let custo_subtotal = 0;
      
      if (formData.tipo_operacao.includes('locacao')) {
        valor_subtotal_bruto = item.valor_unitario * item.quantidade * periodo;
        custo_subtotal = item.custo_unitario * item.quantidade * periodo;
      } else {
        valor_subtotal_bruto = item.valor_unitario * item.quantidade;
        custo_subtotal = item.custo_unitario * item.quantidade;
      }
      
      // Aplicar desconto ao subtotal
      const desconto_valor = (valor_subtotal_bruto * item.desconto) / 100;
      const valor_subtotal = valor_subtotal_bruto - desconto_valor;
      
      return { valor_subtotal, custo_subtotal };
    });
    
    const valor_total = calcItems.reduce((sum, calc) => sum + calc.valor_subtotal, 0);
    const custo_total = calcItems.reduce((sum, calc) => sum + calc.custo_subtotal, 0);
    const lucro_total = valor_total - custo_total;
    // Margem sobre o custo (padrão comercial) - não sobre o valor de venda
    // Tratamento para dividir por zero quando Valor Total for 0
    const margem_percentual = valor_total > 0 
      ? (lucro_total / valor_total) * 100 
      : (custo_total > 0 ? (lucro_total / custo_total) * 100 : 0);
    
    return {
      valor_total,
      custo_total,
      lucro_total,
      margem_percentual: Number(margem_percentual.toFixed(2))
    };
  })();

  // Buscar produtos no Supabase quando necessário (apenas quando há busca)
  useEffect(() => {
    // Se não há busca ou busca muito curta, limpar resultados da busca
    if (!searchProduto || searchProduto.trim().length < 2) {
      setProdutosBuscaSupabase([]);
      setBuscandoProdutos(false);
      return;
    }

    // Debounce para evitar muitas buscas
    const timeoutId = setTimeout(async () => {
      setBuscandoProdutos(true);
      try {
        // Buscar produtos no Supabase
        const resultados = await searchProductsInSupabase(searchProduto);
        
        if (resultados.length > 0) {
          // Buscar dados completos dos produtos encontrados
          const ids = resultados.map(r => r.id);
          const { data: produtosCompletos, error } = await supabase
            .from("products")
            .select(`
              *,
              brand:brands(
                id,
                nome,
                logo_url
              )
            `)
            .in("id", ids)
            .eq("status", "ativo");
          
          if (!error && produtosCompletos) {
            setProdutosBuscaSupabase(produtosCompletos);
          } else {
            setProdutosBuscaSupabase([]);
          }
        } else {
          setProdutosBuscaSupabase([]);
        }
      } catch (error) {
        logger.error("DB", "Erro ao buscar produtos no Supabase", error);
        setProdutosBuscaSupabase([]);
      } finally {
        setBuscandoProdutos(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchProduto]);

  // Combinar produtos locais com produtos da busca no Supabase
  const todosProdutos = useMemo(() => {
    const produtosUnicos = new Map<string, any>();
    
    // Sempre adicionar produtos locais primeiro (base completa)
    produtos.forEach(p => produtosUnicos.set(p.id, p));
    
    // Se há busca com 2+ caracteres e encontrou resultados no Supabase, adicionar/atualizar com produtos da busca
    // Isso garante que produtos encontrados no Supabase (que podem não estar nos locais) sejam incluídos
    if (searchProduto && searchProduto.trim().length >= 2 && produtosBuscaSupabase.length > 0) {
      produtosBuscaSupabase.forEach(p => produtosUnicos.set(p.id, p));
    }
    
    return Array.from(produtosUnicos.values());
  }, [produtos, produtosBuscaSupabase, searchProduto]);
  
  const filteredProdutos = useMemo(() => {
    if (todosProdutos.length === 0) return [];
    
    return todosProdutos.filter(p => {
      // Se há busca, verificar se o produto corresponde
      if (searchProduto && searchProduto.trim().length > 0) {
        const termoBusca = searchProduto.toLowerCase().trim();
        const matchesSearch = 
          p.nome?.toLowerCase().includes(termoBusca) ||
          p.codigo?.toLowerCase().includes(termoBusca) ||
          p.sku_interno?.toLowerCase().includes(termoBusca) ||
          p.codigo_fabricante?.toLowerCase().includes(termoBusca) ||
          p.descricao?.toLowerCase().includes(termoBusca);
        
        if (!matchesSearch) return false;
      }
      
      // Filtrar por tipo de disponibilidade apenas se tipo_operacao estiver definido
      if (formData.tipo_operacao) {
        if (formData.tipo_operacao === 'venda_direta' || formData.tipo_operacao === 'venda_agenciada') {
          return p.tipo_disponibilidade === 'venda' || p.tipo_disponibilidade === 'ambos';
        } else if (formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') {
          return p.tipo_disponibilidade === 'locacao' || p.tipo_disponibilidade === 'ambos';
        }
      }
      
      // Se não há tipo_operacao definido, mostrar todos os produtos
      return true;
    });
  }, [todosProdutos, searchProduto, formData.tipo_operacao]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {proposta ? "Editar Proposta" : "Nova Proposta Comercial"}
          </DialogTitle>
          <DialogDescription>
            {proposta ? "Edite os dados da proposta comercial" : "Preencha os dados para criar uma nova proposta comercial"}
          </DialogDescription>
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
                  onChange={(tipo) => {
                    const isLocacao = tipo.includes('locacao');
                    const prazoPadrao = formData.condicoes_comerciais.prazo_locacao_meses || 12;
                    
                    setFormData({ 
                      ...formData, 
                      tipo_operacao: tipo,
                      // Garantir que prazo_locacao_meses existe quando for locação
                      condicoes_comerciais: {
                        ...formData.condicoes_comerciais,
                        prazo_locacao_meses: isLocacao ? prazoPadrao : formData.condicoes_comerciais.prazo_locacao_meses,
                      },
                    });
                    
                    // Se mudou para locação, aplicar prazo padrão aos itens sem período
                    if (isLocacao && items.length > 0) {
                      const updatedItems = items.map(item => ({
                        ...item,
                        periodo_locacao_meses: item.periodo_locacao_meses || prazoPadrao,
                      }));
                      setItems(updatedItems);
                    }
                  }}
                  disabled={loading}
                />

                {/* Bloco de Seleção de Cotações - Apenas para Venda Agenciada ou Locação Agenciada */}
                {(formData.tipo_operacao === 'venda_agenciada' || formData.tipo_operacao === 'locacao_agenciada') && (
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-semibold">Selecionar Cotação(es)</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Busque e selecione cotações de compras para importar itens para esta proposta
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSelecionarCotacoes}
                          disabled={loading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Buscar Cotações
                        </Button>
                      </div>
                      {cotacoesSelecionadas.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {cotacoesSelecionadas.map((cotacao) => (
                            <Badge key={cotacao.id} variant="secondary">
                              {cotacao.numero_cotacao}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

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

                {/* Card com informações do cliente selecionado */}
                {selectedCliente && (
                  <Card className="p-4 bg-muted/50 border-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{selectedCliente.nome}</h3>
                        <Badge variant="outline">{selectedCliente.tipo || "Cliente"}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedCliente.cnpj && (
                          <div>
                            <span className="text-muted-foreground">CNPJ: </span>
                            <span className="font-mono">{selectedCliente.cnpj}</span>
                          </div>
                        )}
                        {selectedCliente.email && (
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span>{selectedCliente.email}</span>
                          </div>
                        )}
                        {selectedCliente.telefone && (
                          <div>
                            <span className="text-muted-foreground">Telefone: </span>
                            <span>{selectedCliente.telefone}</span>
                          </div>
                        )}
                        {(selectedCliente.cidade || selectedCliente.estado) && (
                          <div>
                            <span className="text-muted-foreground">Localização: </span>
                            <span>{[selectedCliente.cidade, selectedCliente.estado].filter(Boolean).join(" - ")}</span>
                          </div>
                        )}
                      </div>
                      {selectedCliente.origin_partner && (
                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          <span>Parceiro de origem: </span>
                          <span className="font-medium">{selectedCliente.origin_partner.nome_fantasia}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cliente_id: value, oportunidade_id: "" })
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loading 
                            ? "Carregando clientes..." 
                            : clientes.length === 0 
                            ? "Nenhum cliente cadastrado" 
                            : "Selecione o cliente"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Nenhum cliente encontrado. Cadastre clientes primeiro.
                          </div>
                        ) : (
                          clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{cliente.nome}</span>
                                {cliente.cnpj && (
                                  <span className="text-xs text-muted-foreground">
                                    CNPJ: {cliente.cnpj}
                                  </span>
                                )}
                                {(cliente.cidade || cliente.estado) && (
                                  <span className="text-xs text-muted-foreground">
                                    {[cliente.cidade, cliente.estado].filter(Boolean).join(" - ")}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {clientes.length === 0 && !loading && (
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 Vá para a página de Clientes para cadastrar novos clientes.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Oportunidade (Opcional)</Label>
                    <Select
                      value={formData.oportunidade_id || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, oportunidade_id: value })
                      }
                      disabled={!formData.cliente_id || oportunidades.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !formData.cliente_id 
                            ? "Selecione um cliente primeiro" 
                            : oportunidades.length === 0
                            ? "Nenhuma oportunidade disponível"
                            : "Selecione uma oportunidade"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {oportunidades.map((oportunidade) => (
                          <SelectItem key={oportunidade.id} value={oportunidade.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{oportunidade.product_name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{oportunidade.tipo_oportunidade}</span>
                                {oportunidade.valor_estimado && (
                                  <>
                                    <span>•</span>
                                    <span>R$ {oportunidade.valor_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                  </>
                                )}
                                {oportunidade.partner && (
                                  <>
                                    <span>•</span>
                                    <span>{oportunidade.partner.nome_fantasia}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.cliente_id && oportunidades.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Nenhuma oportunidade ativa encontrada para este cliente
                      </p>
                    )}
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
                {/* Resumo Financeiro no topo */}
                <FinancialSummaryPanel
                  valorTotal={calculations.valor_total}
                  custoTotal={calculations.custo_total}
                  lucroTotal={calculations.lucro_total}
                  margemPercentual={calculations.margem_percentual}
                />

                {/* Botão para adicionar itens de cotações - Apenas para Venda Agenciada ou Locação Agenciada */}
                {(formData.tipo_operacao === 'venda_agenciada' || formData.tipo_operacao === 'locacao_agenciada') && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelecionarCotacoes}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Itens da Cotação
                    </Button>
                  </div>
                )}

                {/* A) Tabela de Itens da Proposta */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Itens da Proposta</h3>
                  <TabelaItensProposta
                    items={items}
                    tipoOperacao={formData.tipo_operacao}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                  />
                </div>

                {/* B) Busca e Catálogo de Produtos */}
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Buscar Produtos</h3>
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

                    {filteredProdutos.length > 0 ? (
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {filteredProdutos.map((produto) => (
                          <div
                            key={produto.id}
                            className="flex items-center gap-2 p-1.5 border rounded cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleProdutoClick(produto)}
                          >
                            {produto.imagem_principal && (
                              <img
                                src={produto.imagem_principal}
                                alt={produto.nome}
                                className="h-8 w-8 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate leading-tight">{produto.nome}</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                {produto.sku_interno && (
                                  <span className="font-mono">{produto.sku_interno}</span>
                                )}
                                {produto.codigo && produto.codigo !== produto.sku_interno && (
                                  <>
                                    {produto.sku_interno && <span>•</span>}
                                    <span className="truncate">{produto.codigo}</span>
                                  </>
                                )}
                                {produto.brand && (
                                  <>
                                    {(produto.sku_interno || produto.codigo) && <span>•</span>}
                                    <span className="font-medium truncate">{produto.brand.nome}</span>
                                  </>
                                )}
                                <span className="ml-auto flex items-center gap-1.5">
                                  {produto.estoque_atual !== undefined && (
                                    <>
                                      <span className="hidden sm:inline">Est:</span>
                                      <span className={produto.estoque_atual > 0 ? "text-green-600" : "text-muted-foreground"}>
                                        {produto.estoque_atual || 0}
                                      </span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              {produto.valor_venda ? (
                                <p className="font-semibold text-sm text-success leading-tight">
                                  R$ {produto.valor_venda.toFixed(2)}
                                </p>
                              ) : produto.valor_locacao ? (
                                <p className="font-semibold text-xs text-success leading-tight">
                                  R$ {produto.valor_locacao.toFixed(2)}/mês
                                </p>
                              ) : (
                                <span className="text-muted-foreground text-xs">Sem preço</span>
                              )}
                              {produto.custo_medio && (
                                <p className="text-xs text-muted-foreground leading-tight">
                                  Custo: R$ {produto.custo_medio.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {buscandoProdutos ? (
                          <p>Buscando produtos...</p>
                        ) : searchProduto && searchProduto.trim().length >= 2 ? (
                          <p>Nenhum produto encontrado para "{searchProduto}"</p>
                        ) : filteredProdutos.length === 0 ? (
                          <p>Nenhum produto disponível para este tipo de operação</p>
                        ) : null}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Dialog para adicionar produto */}
                <DialogAdicionarProduto
                  open={dialogAdicionarProdutoOpen}
                  onOpenChange={setDialogAdicionarProdutoOpen}
                  produto={produtoSelecionado}
                  tipoOperacao={formData.tipo_operacao}
                  onConfirm={handleConfirmarAdicionarProduto}
                />
              </TabsContent>

              <TabsContent value="condicoes" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Ocultar Tipo e Parcelas se for locação */}
                  {!(formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && (
                    <>
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
                                // Resetar acréscimo se não for parcelado
                                acrescimo_percentual: value === "parcelado" ? formData.condicoes_comerciais.acrescimo_percentual : 0,
                                // Resetar parcelas se não for parcelado
                                parcelas: value === "parcelado" ? formData.condicoes_comerciais.parcelas : 1,
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
                                parcelas: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          disabled={formData.condicoes_comerciais.tipo !== "parcelado"}
                        />
                      </div>

                      {formData.condicoes_comerciais.tipo === "parcelado" && (
                        <div>
                          <Label>Acréscimo (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.condicoes_comerciais.acrescimo_percentual || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                condicoes_comerciais: {
                                  ...formData.condicoes_comerciais,
                                  acrescimo_percentual: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            placeholder="Ex: 2.5"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Percentual de acréscimo aplicado ao total quando parcelado
                          </p>
                        </div>
                      )}
                    </>
                  )}

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

                  {(formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && (
                    <div>
                      <Label>Prazo de Locação (meses)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.condicoes_comerciais.prazo_locacao_meses || 12}
                        onChange={(e) => {
                          const prazo = parseInt(e.target.value) || 12;
                          
                          // Calcular data final se data inicial estiver preenchida
                          let dataFim = "";
                          if (formData.condicoes_comerciais.prazo_inicio_contrato) {
                            const dataInicio = new Date(formData.condicoes_comerciais.prazo_inicio_contrato);
                            dataInicio.setMonth(dataInicio.getMonth() + prazo);
                            dataFim = dataInicio.toISOString().split('T')[0];
                          }
                          
                          setFormData({
                            ...formData,
                            condicoes_comerciais: {
                              ...formData.condicoes_comerciais,
                              prazo_locacao_meses: prazo,
                              prazo_fim_contrato: dataFim || formData.condicoes_comerciais.prazo_fim_contrato,
                            },
                          });
                          
                          // Aplicar prazo a todos os itens que não têm período definido
                          const updatedItems = items.map(item => ({
                            ...item,
                            periodo_locacao_meses: item.periodo_locacao_meses || prazo,
                          }));
                          setItems(updatedItems);
                        }}
                        placeholder="Ex: 12"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Prazo padrão de locação em meses. Será aplicado automaticamente aos itens sem período definido. Pode ser ajustado individualmente em cada item.
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2 border-t pt-4 mt-4">
                    <Label className="text-base font-semibold">Prazo do Contrato</Label>
                    <div className="grid gap-4 md:grid-cols-2 mt-2">
                      <div>
                        <Label>
                          Prazo Inicial do Contrato
                          {(formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        <Input
                          type="date"
                          value={formData.condicoes_comerciais.prazo_inicio_contrato}
                          onChange={(e) => {
                            const dataInicio = e.target.value;
                            let dataFim = "";
                            
                            // Se for locação e tiver prazo definido, calcular data final automaticamente
                            if ((formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && 
                                formData.condicoes_comerciais.prazo_locacao_meses) {
                              const inicio = new Date(dataInicio);
                              inicio.setMonth(inicio.getMonth() + formData.condicoes_comerciais.prazo_locacao_meses);
                              dataFim = inicio.toISOString().split('T')[0];
                            }
                            
                            setFormData({
                              ...formData,
                              condicoes_comerciais: {
                                ...formData.condicoes_comerciais,
                                prazo_inicio_contrato: dataInicio,
                                prazo_fim_contrato: dataFim || formData.condicoes_comerciais.prazo_fim_contrato,
                              },
                            });
                          }}
                          required={formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada'}
                        />
                      </div>
                      <div>
                        <Label>
                          Prazo Final do Contrato
                          {(formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        <Input
                          type="date"
                          value={formData.condicoes_comerciais.prazo_fim_contrato}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              condicoes_comerciais: {
                                ...formData.condicoes_comerciais,
                                prazo_fim_contrato: e.target.value,
                              },
                            })
                          }
                          required={formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada'}
                          disabled={(formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && 
                                    formData.condicoes_comerciais.prazo_inicio_contrato && 
                                    formData.condicoes_comerciais.prazo_locacao_meses}
                        />
                      </div>
                    </div>
                    {(formData.tipo_operacao === 'locacao_direta' || formData.tipo_operacao === 'locacao_agenciada') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.condicoes_comerciais.prazo_inicio_contrato && formData.condicoes_comerciais.prazo_locacao_meses
                          ? "Data final calculada automaticamente. Preencha a data inicial e o prazo em meses."
                          : "Campos obrigatórios para propostas de locação"}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 border-t pt-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gerar_contas_receber"
                        checked={formData.gerar_contas_receber}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            gerar_contas_receber: checked === true,
                          })
                        }
                      />
                      <Label htmlFor="gerar_contas_receber" className="text-base font-semibold cursor-pointer">
                        Gerar Contas a Receber automaticamente
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {formData.tipo_operacao.includes('locacao')
                        ? `Serão criadas ${formData.condicoes_comerciais.prazo_locacao_meses || 1} contas a receber (mensalidades)`
                        : formData.condicoes_comerciais.tipo === "parcelado" 
                          ? `Serão criadas ${formData.condicoes_comerciais.parcelas || 1} contas a receber (uma por parcela)`
                          : "Será criada 1 conta a receber com o valor total"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="totais" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-4">
                    <Card className="p-6">
                      <div className="space-y-4">
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
                          <Label>Frete (R$):</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={0}
                            onChange={(e) => {
                              // TODO: Adicionar campo de frete no formData
                            }}
                            className="w-40"
                            placeholder="0.00"
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

                        {formData.condicoes_comerciais.tipo === "parcelado" && formData.condicoes_comerciais.acrescimo_percentual > 0 && (
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Acréscimo ({formData.condicoes_comerciais.acrescimo_percentual}%):</span>
                            <span>
                              R$ {((totalItens - formData.desconto_total + formData.despesas_adicionais) * formData.condicoes_comerciais.acrescimo_percentual / 100).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {formData.condicoes_comerciais.tipo === "parcelado" && formData.condicoes_comerciais.parcelas > 1 && (
                          <div className="flex justify-between items-center mt-2 pt-2 border-t">
                            <span className="text-lg font-semibold">
                              Valor da Parcela ({formData.condicoes_comerciais.parcelas}x):
                            </span>
                            <span className="text-lg font-semibold text-success">
                              R$ {calcularValorParcela().toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div>
                    <ResumoFinanceiroPanel
                      totalItens={items.length}
                      somaQuantidades={items.reduce((sum, item) => sum + item.quantidade, 0)}
                      descontoTotal={formData.desconto_total}
                      subtotal={totalItens}
                      frete={0}
                      outrasDespesas={formData.despesas_adicionais}
                      totalGeral={totalGeral}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roi" className="space-y-4">
                <SimuladorROI
                  propostaId={proposta?.id}
                  investimentoInicial={calculations.custo_total}
                  valorVenda={calculations.valor_total}
                  lucroTotal={calculations.lucro_total}
                  margemPercentual={calculations.margem_percentual}
                  tipoOperacao={formData.tipo_operacao}
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

        {/* Dialogs de seleção de cotações */}
        <SelecionarCotacoesDialog
          open={selecionarCotacoesDialogOpen}
          onOpenChange={setSelecionarCotacoesDialogOpen}
          onCotacoesSelecionadas={handleCotacoesSelecionadas}
          clienteId={formData.cliente_id}
          tipoOperacao={formData.tipo_operacao}
        />

        {itensCotacoesDialogOpen && cotacoesSelecionadas.length > 0 && (
          <Dialog open={itensCotacoesDialogOpen} onOpenChange={setItensCotacoesDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Produtos das Cotações Selecionadas</DialogTitle>
                <DialogDescription>
                  Selecione os itens que deseja importar para a proposta
                </DialogDescription>
              </DialogHeader>
              <ItensCotacoesSelecionadas
                cotacoes={cotacoesSelecionadas}
                onImportarItens={handleImportarItensCotacoes}
                onCancelar={() => {
                  setItensCotacoesDialogOpen(false);
                  setCotacoesSelecionadas([]);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
