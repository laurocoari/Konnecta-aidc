import { supabase } from "@/integrations/supabase/client";

export interface CotacaoCompleta {
  id: string;
  numero_cotacao: string;
  supplier_id: string;
  supplier: {
    id: string;
    nome: string;
    cnpj?: string;
  };
  moeda: string;
  taxa_cambio: number | null;
  cliente_final_id: string | null;
  cliente_final: {
    id: string;
    nome: string;
    cidade?: string;
    estado?: string;
  } | null;
  data_cotacao: string;
  validade: string;
  total_cotacao: number;
  quantidade_itens: number;
  itens: CotacaoItem[];
}

export interface CotacaoItem {
  id: string;
  cotacao_id: string;
  product_id: string | null;
  part_number: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number; // Valor unitário na moeda de origem (BRL ou USD)
  moeda: string; // Moeda do item (BRL ou USD)
  valor_original: number | null; // Valor original antes de conversão (se aplicável)
  valor_convertido: number | null; // Valor convertido para BRL (se já calculado na base)
  custo_dolar: number | null;
  status: string;
  total?: number; // Total do item (quantidade * preco_unitario) - apenas para referência
}

/**
 * Busca todas as cotações ativas
 * @returns Lista de cotações completas com itens
 */
export async function buscarTodasCotacoesAtivas(): Promise<CotacaoCompleta[]> {
  try {
    const { data: cotações, error } = await supabase
      .from("cotacoes_compras")
      .select(`
        *,
        supplier:suppliers(id, nome, cnpj),
        cliente_final:clients(id, nome, cidade, estado)
      `)
      .eq("status", "ativo")
      .order("data_cotacao", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erro ao buscar cotações:", error);
      throw error;
    }

    if (!cotações || cotações.length === 0) {
      return [];
    }

    // Buscar itens de cada cotação
    const cotacoesComItens = await Promise.all(
      cotações.map(async (cotacao) => {
        const { data: itens, error: itensError } = await supabase
          .from("cotacoes_compras_itens")
          .select("*")
          .eq("cotacao_id", cotacao.id)
          .order("descricao");

        if (itensError) {
          console.error(`Erro ao buscar itens da cotação ${cotacao.id}:`, itensError);
          return {
            ...cotacao,
            itens: [],
          };
        }

        return {
          ...cotacao,
          itens: (itens || []) as CotacaoItem[],
        };
      })
    );

    return cotacoesComItens as CotacaoCompleta[];
  } catch (error) {
    console.error("Erro ao buscar todas as cotações:", error);
    throw error;
  }
}

/**
 * Busca cotações por número, fornecedor ou cliente final
 * @param query - Termo de busca (número da cotação, nome do fornecedor ou cliente final)
 * @returns Lista de cotações completas com itens
 */
export async function buscarCotacoes(query: string): Promise<CotacaoCompleta[]> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    // Buscar cotações que correspondem ao termo de busca
    // Buscar primeiro por número de cotação, depois filtrar por fornecedor/cliente final
    let queryBuilder = supabase
      .from("cotacoes_compras")
      .select(`
        *,
        supplier:suppliers(id, nome, cnpj),
        cliente_final:clients(id, nome, cidade, estado)
      `)
      .eq("status", "ativo")
      .ilike("numero_cotacao", `%${searchTerm}%`)
      .order("data_cotacao", { ascending: false })
      .limit(50);

    const { data: cotaçõesPorNumero, error: errorNumero } = await queryBuilder;

    // Buscar também por fornecedor
    const { data: fornecedores, error: errorFornecedor } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("nome", `%${searchTerm}%`)
      .limit(10);

    // Buscar também por cliente final
    const { data: clientes, error: errorCliente } = await supabase
      .from("clients")
      .select("id")
      .ilike("nome", `%${searchTerm}%`)
      .limit(10);

    if (errorNumero) {
      console.error("Erro ao buscar cotações por número:", errorNumero);
    }
    if (errorFornecedor) {
      console.error("Erro ao buscar fornecedores:", errorFornecedor);
    }
    if (errorCliente) {
      console.error("Erro ao buscar clientes:", errorCliente);
    }

    // Buscar cotações por fornecedor
    let cotaçõesPorFornecedor: any[] = [];
    if (fornecedores && fornecedores.length > 0) {
      const fornecedorIds = fornecedores.map((f) => f.id);
      const { data, error } = await supabase
        .from("cotacoes_compras")
        .select(`
          *,
          supplier:suppliers(id, nome, cnpj),
          cliente_final:clients(id, nome, cidade, estado)
        `)
        .eq("status", "ativo")
        .in("supplier_id", fornecedorIds)
        .order("data_cotacao", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        cotaçõesPorFornecedor = data;
      }
    }

    // Buscar cotações por cliente final
    let cotaçõesPorCliente: any[] = [];
    if (clientes && clientes.length > 0) {
      const clienteIds = clientes.map((c) => c.id);
      const { data, error } = await supabase
        .from("cotacoes_compras")
        .select(`
          *,
          supplier:suppliers(id, nome, cnpj),
          cliente_final:clients(id, nome, cidade, estado)
        `)
        .eq("status", "ativo")
        .in("cliente_final_id", clienteIds)
        .order("data_cotacao", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        cotaçõesPorCliente = data;
      }
    }

    // Combinar resultados e remover duplicatas
    const todasCotações = [
      ...(cotaçõesPorNumero || []),
      ...cotaçõesPorFornecedor,
      ...cotaçõesPorCliente,
    ];
    
    const cotaçõesUnicas = Array.from(
      new Map(todasCotações.map((c) => [c.id, c])).values()
    ).slice(0, 50);

    if (!cotaçõesUnicas || cotaçõesUnicas.length === 0) {
      return [];
    }

    // Buscar itens de cada cotação
    const cotacoesComItens = await Promise.all(
      cotaçõesUnicas.map(async (cotacao) => {
        const { data: itens, error: itensError } = await supabase
          .from("cotacoes_compras_itens")
          .select("*")
          .eq("cotacao_id", cotacao.id)
          .order("descricao");

        if (itensError) {
          console.error(`Erro ao buscar itens da cotação ${cotacao.id}:`, itensError);
          return {
            ...cotacao,
            itens: [],
          };
        }

        return {
          ...cotacao,
          itens: (itens || []) as CotacaoItem[],
        };
      })
    );

    return cotacoesComItens as CotacaoCompleta[];
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    throw error;
  }
}

/**
 * Busca uma cotação específica por ID com todos os seus itens
 * @param cotacaoId - ID da cotação
 * @returns Cotação completa com itens
 */
export async function buscarCotacaoPorId(cotacaoId: string): Promise<CotacaoCompleta | null> {
  try {
    const { data: cotacao, error } = await supabase
      .from("cotacoes_compras")
      .select(`
        *,
        supplier:suppliers(id, nome, cnpj),
        cliente_final:clients(id, nome, cidade, estado)
      `)
      .eq("id", cotacaoId)
      .single();

    if (error) {
      console.error("Erro ao buscar cotação:", error);
      throw error;
    }

    if (!cotacao) {
      return null;
    }

    // Buscar itens da cotação
    const { data: itens, error: itensError } = await supabase
      .from("cotacoes_compras_itens")
      .select("*")
      .eq("cotacao_id", cotacaoId)
      .order("descricao");

    if (itensError) {
      console.error("Erro ao buscar itens da cotação:", itensError);
      throw itensError;
    }

    return {
      ...cotacao,
      itens: (itens || []) as CotacaoItem[],
    } as CotacaoCompleta;
  } catch (error) {
    console.error("Erro ao buscar cotação por ID:", error);
    throw error;
  }
}

/**
 * Busca múltiplas cotações por IDs
 * @param cotacoesIds - Array de IDs das cotações
 * @returns Lista de cotações completas com itens
 */
export async function buscarCotacoesPorIds(cotacoesIds: string[]): Promise<CotacaoCompleta[]> {
  try {
    if (!cotacoesIds || cotacoesIds.length === 0) {
      return [];
    }

    const { data: cotações, error } = await supabase
      .from("cotacoes_compras")
      .select(`
        *,
        supplier:suppliers(id, nome, cnpj),
        cliente_final:clients(id, nome, cidade, estado)
      `)
      .in("id", cotacoesIds)
      .order("data_cotacao", { ascending: false });

    if (error) {
      console.error("Erro ao buscar cotações:", error);
      throw error;
    }

    if (!cotações || cotações.length === 0) {
      return [];
    }

    // Buscar itens de cada cotação
    const cotacoesComItens = await Promise.all(
      cotações.map(async (cotacao) => {
        const { data: itens, error: itensError } = await supabase
          .from("cotacoes_compras_itens")
          .select("*")
          .eq("cotacao_id", cotacao.id)
          .order("descricao");

        if (itensError) {
          console.error(`Erro ao buscar itens da cotação ${cotacao.id}:`, itensError);
          return {
            ...cotacao,
            itens: [],
          };
        }

        return {
          ...cotacao,
          itens: (itens || []) as CotacaoItem[],
        };
      })
    );

    return cotacoesComItens as CotacaoCompleta[];
  } catch (error) {
    console.error("Erro ao buscar cotações por IDs:", error);
    throw error;
  }
}

