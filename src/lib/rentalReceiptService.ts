import { supabase } from "@/integrations/supabase/client";
import { currencyToWords } from "./numberToWords";
import { logger } from "./logger";

export interface CreateRentalReceiptParams {
  cliente_id: string;
  proposta_id?: string;
  contrato_id?: string;
  data_emissao?: string;
  data_vencimento?: string;
  periodo_locacao_inicio?: string;
  periodo_locacao_fim?: string;
  numero_contrato?: string;
  items: Array<{
    product_id?: string;
    item?: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
  }>;
  bank_account_id?: string;
  observacoes?: string;
}

/**
 * Cria um recibo de locação com base nos parâmetros fornecidos
 */
export async function createRentalReceipt(
  params: CreateRentalReceiptParams
): Promise<{ id: string; numero_recibo: string }> {
  try {
    logger.db("Criando recibo de locação");

    // Validar que há pelo menos 1 item
    if (!params.items || params.items.length === 0) {
      throw new Error("Recibo deve ter pelo menos 1 item locado");
    }

    // Calcular total geral
    const totalGeral = params.items.reduce((sum, item) => {
      const total = item.quantidade * item.valor_unitario;
      return sum + total;
    }, 0);

    // Gerar número do recibo
    const { data: numeroData, error: numeroError } = await supabase.rpc(
      "generate_rental_receipt_number"
    );

    if (numeroError) {
      logger.error("Erro ao gerar número do recibo:", numeroError);
      throw new Error("Erro ao gerar número do recibo");
    }

    const numeroRecibo = numeroData || `REC-${new Date().getFullYear()}-${Date.now()}`;

    // Converter total para extenso
    const totalExtenso = currencyToWords(totalGeral);

    // Buscar ID do usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Criar recibo
    const { data: receipt, error: receiptError } = await supabase
      .from("rental_receipts")
      .insert({
        numero_recibo: numeroRecibo,
        cliente_id: params.cliente_id,
        proposta_id: params.proposta_id || null,
        contrato_id: params.contrato_id || null,
        data_emissao: params.data_emissao || new Date().toISOString().split("T")[0],
        data_vencimento: params.data_vencimento || null,
        periodo_locacao_inicio: params.periodo_locacao_inicio || null,
        periodo_locacao_fim: params.periodo_locacao_fim || null,
        numero_contrato: params.numero_contrato || null,
        total_geral: totalGeral,
        total_extenso: totalExtenso,
        observacoes: params.observacoes || null,
        bank_account_id: params.bank_account_id || null,
        created_by: user.id,
      })
      .select("id, numero_recibo")
      .single();

    if (receiptError) {
      logger.error("Erro ao criar recibo:", receiptError);
      throw receiptError;
    }

    // Criar itens do recibo
    const receiptItems = params.items.map((item, index) => ({
      rental_receipt_id: receipt.id,
      product_id: item.product_id || null,
      item: item.item || `Item ${index + 1}`,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      total: item.quantidade * item.valor_unitario,
      ordem: index,
    }));

    const { error: itemsError } = await supabase
      .from("rental_receipt_items")
      .insert(receiptItems);

    if (itemsError) {
      logger.error("Erro ao criar itens do recibo:", itemsError);
      // Tentar deletar o recibo criado
      await supabase.from("rental_receipts").delete().eq("id", receipt.id);
      throw itemsError;
    }

    logger.db(`Recibo criado com sucesso: ${receipt.numero_recibo}`);

    return {
      id: receipt.id,
      numero_recibo: receipt.numero_recibo,
    };
  } catch (error: any) {
    logger.error("Erro ao criar recibo de locação:", error);
    throw error;
  }
}

/**
 * Cria um recibo de locação a partir de uma proposta com tipo_operacao = 'locacao_direta'
 */
export async function createRentalReceiptFromProposal(
  propostaId: string,
  options?: {
    data_vencimento?: string;
    periodo_locacao_inicio?: string;
    periodo_locacao_fim?: string;
    bank_account_id?: string;
    observacoes?: string;
  }
): Promise<{ id: string; numero_recibo: string }> {
  try {
    // Buscar proposta com itens e cliente
    const { data: proposta, error: propostaError } = await supabase
      .from("proposals")
      .select(`
        *,
        cliente:clients(*),
        items:proposal_items(*)
      `)
      .eq("id", propostaId)
      .single();

    if (propostaError) throw propostaError;

    // Validar que é locação (direta ou agenciada)
    if (!proposta.tipo_operacao.includes("locacao")) {
      throw new Error("Proposta deve ser do tipo locação");
    }

    // Validar que há itens
    if (!proposta.items || proposta.items.length === 0) {
      throw new Error("Proposta deve ter pelo menos 1 item");
    }

    // Montar itens do recibo
    const items = proposta.items.map((item: any) => ({
      product_id: item.product_id,
      descricao: item.descricao || `Item ${item.product_id}`,
      quantidade: item.quantidade,
      valor_unitario: parseFloat(item.valor_unitario || item.preco_unitario || 0),
    }));

    // Criar recibo
    return await createRentalReceipt({
      cliente_id: proposta.cliente_id,
      proposta_id: propostaId,
      data_vencimento: options?.data_vencimento,
      periodo_locacao_inicio: options?.periodo_locacao_inicio,
      periodo_locacao_fim: options?.periodo_locacao_fim,
      numero_contrato: proposta.numero_contrato,
      bank_account_id: options?.bank_account_id,
      observacoes: options?.observacoes || proposta.observacoes,
      items,
    });
  } catch (error: any) {
    logger.error("Erro ao criar recibo a partir de proposta:", error);
    throw error;
  }
}

/**
 * Cria um recibo de locação a partir de um contrato
 */
export async function createRentalReceiptFromContract(
  contratoId: string,
  options?: {
    data_vencimento?: string;
    periodo_locacao_inicio?: string;
    periodo_locacao_fim?: string;
    bank_account_id?: string;
    observacoes?: string;
  }
): Promise<{ id: string; numero_recibo: string }> {
  try {
    // Buscar contrato com itens e cliente
    const { data: contrato, error: contratoError } = await supabase
      .from("contracts")
      .select(`
        *,
        cliente:clients(*),
        items:contract_items(*)
      `)
      .eq("id", contratoId)
      .single();

    if (contratoError) throw contratoError;

    // Validar que é contrato de locação
    if (contrato.tipo !== "locacao") {
      throw new Error("Contrato deve ser do tipo locação");
    }

    // Validar que há itens
    if (!contrato.items || contrato.items.length === 0) {
      throw new Error("Contrato deve ter pelo menos 1 item");
    }

    // Montar itens do recibo
    const items = contrato.items.map((item: any) => ({
      product_id: item.product_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: parseFloat(item.valor_unitario || 0),
    }));

    // Criar recibo
    return await createRentalReceipt({
      cliente_id: contrato.cliente_id,
      contrato_id: contratoId,
      data_vencimento: options?.data_vencimento,
      periodo_locacao_inicio: options?.periodo_locacao_inicio || contrato.data_inicio,
      periodo_locacao_fim: options?.periodo_locacao_fim || contrato.data_fim,
      numero_contrato: contrato.numero,
      bank_account_id: options?.bank_account_id,
      observacoes: options?.observacoes || contrato.observacoes,
      items,
    });
  } catch (error: any) {
    logger.error("Erro ao criar recibo a partir de contrato:", error);
    throw error;
  }
}

/**
 * Cria um recibo de locação a partir de uma conta a receber de locação
 */
export async function createRentalReceiptFromAccountReceivable(
  accountReceivableId: string,
  options?: {
    data_vencimento?: string;
    periodo_locacao_inicio?: string;
    periodo_locacao_fim?: string;
    bank_account_id?: string;
    observacoes?: string;
  }
): Promise<{ id: string; numero_recibo: string; account_receivable_id?: string }> {
  try {
    logger.db(`Criando recibo de locação a partir de conta a receber ${accountReceivableId}`);

    // Buscar conta a receber com contato
    const { data: accountReceivable, error: arError } = await supabase
      .from("accounts_receivable")
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq("id", accountReceivableId)
      .single();

    if (arError) throw arError;
    if (!accountReceivable) {
      throw new Error("Conta a receber não encontrada");
    }

    // Buscar proposta relacionada
    let proposta: any = null;
    let clienteId: string | null = null;

    if (accountReceivable.origem === "proposta" && accountReceivable.referencia_id) {
      // Buscar proposta diretamente
      const { data: propostaData, error: propostaError } = await supabase
        .from("proposals")
        .select(`
          *,
          cliente:clients(id)
        `)
        .eq("id", accountReceivable.referencia_id)
        .single();

      if (propostaError) throw propostaError;
      proposta = propostaData;
      clienteId = proposta?.cliente?.id || null;
    } else if (accountReceivable.origem === "pedido_venda" && accountReceivable.referencia_id) {
      // Buscar pedido e depois proposta relacionada
      const { data: pedido, error: pedidoError } = await supabase
        .from("sales_orders")
        .select(`
          *,
          cliente:clients(id),
          proposta:proposals(*)
        `)
        .eq("id", accountReceivable.referencia_id)
        .single();

      if (pedidoError) throw pedidoError;
      proposta = pedido?.proposta;
      clienteId = pedido?.cliente?.id || null;
    }

    if (!proposta) {
      throw new Error("Não foi possível encontrar proposta relacionada à conta a receber");
    }

    // Validar que é locação (direta ou agenciada)
    if (!proposta.tipo_operacao || !proposta.tipo_operacao.includes("locacao")) {
      throw new Error("Conta a receber deve ser de locação (direta ou agenciada)");
    }

    // Buscar cliente se não encontrado
    if (!clienteId && accountReceivable.contact_id) {
      // Tentar buscar cliente através do contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("cliente_id")
        .eq("id", accountReceivable.contact_id)
        .single();

      if (!contactError && contact?.cliente_id) {
        clienteId = contact.cliente_id;
      }
    }

    if (!clienteId) {
      // Buscar cliente da proposta
      const { data: propostaCompleta, error: propostaCompletaError } = await supabase
        .from("proposals")
        .select("cliente_id")
        .eq("id", proposta.id)
        .single();

      if (propostaCompletaError) throw propostaCompletaError;
      clienteId = propostaCompleta.cliente_id;
    }

    if (!clienteId) {
      throw new Error("Não foi possível identificar o cliente");
    }

    // Buscar itens da proposta
    const { data: propostaItems, error: itemsError } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposta.id);

    if (itemsError) throw itemsError;

    if (!propostaItems || propostaItems.length === 0) {
      throw new Error("Proposta deve ter pelo menos 1 item para gerar recibo");
    }

    // Calcular período de locação baseado na data de vencimento
    const dataVencimento = options?.data_vencimento || accountReceivable.data_vencimento;
    let periodoInicio = options?.periodo_locacao_inicio;
    let periodoFim = options?.periodo_locacao_fim;

    if (!periodoInicio && dataVencimento) {
      // Se não informado, usar data de vencimento como início do período
      const dataVenc = new Date(dataVencimento);
      periodoInicio = dataVenc.toISOString().split("T")[0];
      
      // Se houver período de contrato na proposta, usar
      if (proposta.condicoes_comerciais?.prazo_inicio_contrato) {
        periodoInicio = proposta.condicoes_comerciais.prazo_inicio_contrato;
      }
    }

    if (!periodoFim && periodoInicio) {
      // Calcular fim do período (1 mês após início)
      const dataInicio = new Date(periodoInicio);
      dataInicio.setMonth(dataInicio.getMonth() + 1);
      periodoFim = dataInicio.toISOString().split("T")[0];
      
      // Se houver período de contrato na proposta, usar
      if (proposta.condicoes_comerciais?.prazo_fim_contrato) {
        periodoFim = proposta.condicoes_comerciais.prazo_fim_contrato;
      }
    }

    // Montar itens do recibo
    const items = propostaItems.map((item: any) => ({
      product_id: item.product_id,
      descricao: item.descricao || `Item ${item.product_id}`,
      quantidade: item.quantidade,
      valor_unitario: parseFloat(item.valor_unitario || item.preco_unitario || 0),
    }));

    // Criar recibo
    const receiptResult = await createRentalReceipt({
      cliente_id: clienteId,
      proposta_id: proposta.id,
      data_emissao: accountReceivable.data_emissao || new Date().toISOString().split("T")[0],
      data_vencimento: dataVencimento,
      periodo_locacao_inicio: periodoInicio,
      periodo_locacao_fim: periodoFim,
      numero_contrato: proposta.numero_contrato,
      bank_account_id: options?.bank_account_id,
      observacoes: options?.observacoes || accountReceivable.observacoes || `Mensalidade - Conta a receber ${accountReceivableId}`,
      items,
    });

    // Atualizar recibo com account_receivable_id se o campo existir
    try {
      await supabase
        .from("rental_receipts")
        .update({ account_receivable_id: accountReceivableId })
        .eq("id", receiptResult.id);
    } catch (updateError) {
      // Campo pode não existir ainda, não é crítico
      logger.warn("Não foi possível atualizar account_receivable_id no recibo:", updateError);
    }

    logger.db(`Recibo criado com sucesso a partir de conta a receber: ${receiptResult.numero_recibo}`);

    return {
      ...receiptResult,
      account_receivable_id: accountReceivableId,
    };
  } catch (error: any) {
    logger.error("Erro ao criar recibo a partir de conta a receber:", error);
    throw error;
  }
}

