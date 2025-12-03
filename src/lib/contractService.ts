import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";
import { generateContractNumber } from "./contractUtils";
import { calculateContractStatus, shouldUpdateStatus } from "./contractStatus";

export interface ContractWithRelations {
  id: string;
  numero: string;
  cliente_id: string;
  modelo_id: string | null;
  proposta_id: string | null;
  tipo: "locacao" | "venda" | "comodato" | "servico";
  data_inicio: string;
  data_fim: string | null;
  valor_total: number;
  valor_mensal: number | null;
  status: string;
  versao: number;
  observacoes: string | null;
  cliente?: {
    id: string;
    nome: string;
    cnpj: string | null;
    email: string | null;
    telefone: string | null;
  };
  modelo?: {
    id: string;
    nome: string;
    tipo: string;
  };
  proposta?: {
    id: string;
    codigo: string;
    total_geral: number;
  };
  items?: Array<{
    id: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    product_id: string | null;
  }>;
}

export interface CreateContractParams {
  proposta_id: string;
  modelo_id: string;
  data_inicio: string;
  data_fim: string | null;
  observacoes?: string | null;
}

/**
 * Carrega todos os contratos com seus relacionamentos
 */
export async function loadContratos(): Promise<ContractWithRelations[]> {
  try {
    logger.db("Carregando contratos com relacionamentos");

    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        cliente:clients(
          id,
          nome,
          cnpj,
          email,
          telefone
        ),
        modelo:contract_templates(
          id,
          nome,
          tipo
        ),
        proposta:proposals(
          id,
          codigo,
          total_geral
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("CONTRACT", "Erro ao carregar contratos", error);
      throw error;
    }

    // Carregar itens dos contratos
    const contractIds = (data || []).map((c) => c.id);
    let itemsMap: Record<string, any[]> = {};

    if (contractIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("contract_items")
        .select("*")
        .in("contract_id", contractIds)
        .order("created_at", { ascending: true });

      if (itemsError) {
        logger.warn("CONTRACT", "Erro ao carregar itens dos contratos", itemsError);
      } else {
        // Agrupar itens por contract_id
        itemsMap = (itemsData || []).reduce((acc, item) => {
          if (!acc[item.contract_id]) {
            acc[item.contract_id] = [];
          }
          acc[item.contract_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);
      }
    }

    // Calcular status e adicionar itens
    const contracts = (data || []).map((contract) => {
      const calculatedStatus = calculateContractStatus(
        contract.data_inicio,
        contract.data_fim,
        contract.status as any
      );

      // Atualizar status se necessário
      const statusToUpdate = shouldUpdateStatus(
        contract.data_inicio,
        contract.data_fim,
        contract.status as any
      );

      return {
        ...contract,
        status: statusToUpdate || calculatedStatus,
        items: itemsMap[contract.id] || [],
      } as ContractWithRelations;
    });

    // Atualizar status no banco se necessário (em lote)
    const contractsToUpdate = contracts
      .map((c, idx) => {
        const original = data![idx];
        const statusToUpdate = shouldUpdateStatus(
          original.data_inicio,
          original.data_fim,
          original.status as any
        );
        if (statusToUpdate) {
          return { id: c.id, status: statusToUpdate };
        }
        return null;
      })
      .filter(Boolean) as Array<{ id: string; status: string }>;

    if (contractsToUpdate.length > 0) {
      // Atualizar em lote
      for (const update of contractsToUpdate) {
        await supabase
          .from("contracts")
          .update({ status: update.status })
          .eq("id", update.id);
      }
      logger.db(`Atualizados ${contractsToUpdate.length} status de contratos`);
    }

    logger.db(`✅ ${contracts.length} contrato(s) carregado(s)`);
    return contracts;
  } catch (error: any) {
    logger.error("CONTRACT", "Erro ao carregar contratos", error);
    throw error;
  }
}

/**
 * Carrega propostas aprovadas com dados do cliente
 */
export async function loadPropostasAprovadas() {
  try {
    logger.db("Carregando propostas aprovadas");

    const { data, error } = await supabase
      .from("proposals")
      .select(`
        id,
        codigo,
        total_geral,
        tipo_operacao,
        cliente:clients(
          id,
          nome,
          cnpj,
          email,
          telefone
        )
      `)
      .eq("status", "aprovada")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("CONTRACT", "Erro ao carregar propostas aprovadas", error);
      throw error;
    }

    logger.db(`✅ ${data?.length || 0} proposta(s) aprovada(s) encontrada(s)`);
    return data || [];
  } catch (error: any) {
    logger.error("CONTRACT", "Erro ao carregar propostas aprovadas", error);
    throw error;
  }
}

/**
 * Carrega modelos de contrato ativos
 */
export async function loadModelosAtivos(tipo?: string) {
  try {
    logger.db("Carregando modelos de contrato ativos");

    let query = supabase
      .from("contract_templates")
      .select("*")
      .order("nome", { ascending: true });

    // Filtrar apenas por status ativo
    query = query.eq("status", "ativo");

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("CONTRACT", "Erro ao carregar modelos", error);
      logger.error("CONTRACT", "Detalhes do erro", { error, tipo });
      throw error;
    }

    logger.db(`✅ ${data?.length || 0} modelo(s) encontrado(s)${tipo ? ` (tipo: ${tipo})` : ""}`);
    return data || [];
  } catch (error: any) {
    logger.error("CONTRACT", "Erro ao carregar modelos", error);
    throw error;
  }
}

/**
 * Cria um contrato a partir de uma proposta aprovada
 */
export async function createContractFromProposal(
  params: CreateContractParams
): Promise<{ id: string; numero: string }> {
  try {
    logger.info("CONTRACT", `Criando contrato a partir da proposta ${params.proposta_id}`);

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Carregar proposta completa com cliente
    const { data: proposta, error: propostaError } = await supabase
      .from("proposals")
      .select(`
        *,
        cliente:clients(*)
      `)
      .eq("id", params.proposta_id)
      .eq("status", "aprovada")
      .single();

    if (propostaError) {
      logger.error("CONTRACT", "Erro ao carregar proposta", propostaError);
      throw propostaError;
    }

    if (!proposta) {
      throw new Error("Proposta não encontrada ou não está aprovada");
    }

    // Carregar modelo
    const { data: modelo, error: modeloError } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("id", params.modelo_id)
      .eq("status", "ativo")
      .single();

    if (modeloError) {
      logger.error("CONTRACT", "Erro ao carregar modelo", modeloError);
      throw modeloError;
    }

    if (!modelo) {
      throw new Error("Modelo não encontrado ou não está ativo");
    }

    // Gerar número único
    const numero = await generateContractNumber();

    // Calcular valores
    const valorTotal = proposta.total_geral || 0;
    const valorMensal = modelo.tipo === "locacao" ? valorTotal : null;

    // Calcular status inicial
    const statusInicial = calculateContractStatus(
      params.data_inicio,
      params.data_fim,
      "rascunho"
    );

    // Criar contrato
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        numero,
        cliente_id: proposta.cliente_id,
        modelo_id: params.modelo_id,
        proposta_id: params.proposta_id,
        tipo: modelo.tipo as any,
        data_inicio: params.data_inicio,
        data_fim: params.data_fim,
        valor_total: valorTotal,
        valor_mensal: valorMensal,
        status: statusInicial,
        observacoes: params.observacoes || null,
        created_by: user.id,
      })
      .select("id, numero")
      .single();

    if (contractError) {
      logger.error("CONTRACT", "Erro ao criar contrato", contractError);
      throw contractError;
    }

    // Carregar itens da proposta
    const { data: propostaItems, error: itemsLoadError } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", params.proposta_id);

    if (itemsLoadError) {
      logger.warn("CONTRACT", "Erro ao carregar itens da proposta", itemsLoadError);
    }

    // Criar itens do contrato a partir dos itens da proposta
    if (propostaItems && propostaItems.length > 0) {
      const contractItems = propostaItems.map((item: any) => ({
        contract_id: contract.id,
        product_id: item.product_id || null,
        codigo: item.codigo || null,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.preco_unitario || item.valor_unitario || 0,
        valor_total: item.total || item.quantidade * (item.preco_unitario || item.valor_unitario || 0),
        observacoes: null,
      }));

      const { error: itemsError } = await supabase
        .from("contract_items")
        .insert(contractItems);

      if (itemsError) {
        logger.error("CONTRACT", "Erro ao criar itens do contrato", itemsError);
        // Tentar deletar o contrato criado
        await supabase.from("contracts").delete().eq("id", contract.id);
        throw itemsError;
      }

      logger.db(`✅ ${contractItems.length} item(ns) criado(s) para o contrato`);
    }

    logger.info("CONTRACT", `✅ Contrato ${numero} criado com sucesso`);
    return {
      id: contract.id,
      numero: contract.numero,
    };
  } catch (error: any) {
    logger.error("CONTRACT", "Erro ao criar contrato", error);
    throw error;
  }
}

