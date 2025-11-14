import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

/**
 * Busca ou cria um contact a partir de um cliente
 */
async function findOrCreateContactFromClient(clienteId: string): Promise<string> {
  try {
    // Buscar dados do cliente
    const { data: cliente, error: clienteError } = await supabase
      .from("clients")
      .select("id, nome, email, telefone, cnpj")
      .eq("id", clienteId)
      .single();

    if (clienteError) throw clienteError;
    if (!cliente) throw new Error("Cliente não encontrado");

    // Tentar encontrar contact existente
    // Buscar por empresa primeiro
    let { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("tipo", "cliente")
      .eq("empresa", cliente.nome)
      .maybeSingle();

    // Se não encontrou por empresa, buscar por nome
    if (!existingContact) {
      const { data: contactByName } = await supabase
        .from("contacts")
        .select("id")
        .eq("tipo", "cliente")
        .eq("nome", cliente.nome)
        .maybeSingle();
      existingContact = contactByName || null;
    }

    if (existingContact) {
      logger.db(`Contact encontrado para cliente ${cliente.nome}: ${existingContact.id}`);
      return existingContact.id;
    }

    // Criar novo contact
    const { data: newContact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        tipo: "cliente",
        nome: cliente.nome,
        empresa: cliente.nome,
        email: cliente.email || "",
        telefone: cliente.telefone || "",
      })
      .select("id")
      .single();

    if (contactError) throw contactError;
    if (!newContact) throw new Error("Erro ao criar contact");

    logger.db(`Contact criado para cliente ${cliente.nome}: ${newContact.id}`);
    return newContact.id;
  } catch (error: any) {
    logger.error("Erro ao buscar/criar contact:", error);
    throw error;
  }
}

/**
 * Cria contas a receber a partir de uma proposta
 */
export async function createAccountsReceivableFromProposal(
  propostaId: string,
  options?: {
    valorTotal: number;
    parcelas?: number;
    dataEmissao?: string;
  }
): Promise<string[]> {
  try {
    logger.db(`Criando contas a receber para proposta ${propostaId}`);

    // Buscar proposta com cliente
    const { data: proposta, error: propostaError } = await supabase
      .from("proposals")
      .select(`
        *,
        cliente:clients(*)
      `)
      .eq("id", propostaId)
      .single();

    if (propostaError) throw propostaError;
    if (!proposta) throw new Error("Proposta não encontrada");

    // Buscar ou criar contact
    const contactId = await findOrCreateContactFromClient(proposta.cliente_id);

    // Buscar usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const valorTotal = options?.valorTotal || proposta.total_geral || 0;
    const parcelas = options?.parcelas || proposta.condicoes_comerciais?.parcelas || 1;
    const dataEmissao = options?.dataEmissao || proposta.data_proposta || new Date().toISOString().split("T")[0];
    
    // Para locação, usar data inicial do contrato se disponível
    const isLocacao = proposta.tipo_operacao?.includes('locacao');
    const dataInicioContrato = proposta.condicoes_comerciais?.prazo_inicio_contrato;
    const dataBase = isLocacao && dataInicioContrato ? dataInicioContrato : dataEmissao;

    const contasIds: string[] = [];

    if (parcelas > 1) {
      // Criar múltiplas contas (uma por parcela/mês)
      const valorParcela = valorTotal / parcelas;

      for (let i = 0; i < parcelas; i++) {
        // Para locação: cada mês a partir da data inicial do contrato
        // Para venda: primeira parcela em 30 dias, demais incrementando 30 dias
        const dataVencimento = new Date(dataBase);
        if (isLocacao) {
          dataVencimento.setMonth(dataVencimento.getMonth() + i);
        } else {
          dataVencimento.setDate(dataVencimento.getDate() + 30 * (i + 1));
        }

        const { data: conta, error: contaError } = await supabase
          .from("accounts_receivable")
          .insert({
            contact_id: contactId,
            origem: "proposta",
            referencia_id: propostaId,
            valor_total: Math.round(valorParcela * 100) / 100, // Arredondar para 2 casas decimais
            valor_pago: 0,
            data_emissao: dataEmissao,
            data_vencimento: dataVencimento.toISOString().split("T")[0],
            status: "pendente",
            observacoes: isLocacao 
              ? `Mensalidade ${i + 1} de ${parcelas} - Proposta ${proposta.codigo || propostaId}`
              : `Parcela ${i + 1} de ${parcelas} - Proposta ${proposta.codigo || propostaId}`,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (contaError) throw contaError;
        if (conta) {
          contasIds.push(conta.id);
          logger.db(`Conta a receber criada: ${conta.id} (${isLocacao ? 'Mensalidade' : 'Parcela'} ${i + 1}/${parcelas})`);
        }
      }
    } else {
      // Criar uma única conta
      const dataVencimento = new Date(dataEmissao);
      dataVencimento.setDate(dataVencimento.getDate() + 30); // 30 dias da data de emissão

      const { data: conta, error: contaError } = await supabase
        .from("accounts_receivable")
        .insert({
          contact_id: contactId,
          origem: "proposta",
          referencia_id: propostaId,
          valor_total: Math.round(valorTotal * 100) / 100,
          valor_pago: 0,
          data_emissao: dataEmissao,
          data_vencimento: dataVencimento.toISOString().split("T")[0],
          status: "pendente",
          observacoes: `Proposta ${proposta.codigo || propostaId}`,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (contaError) throw contaError;
      if (conta) {
        contasIds.push(conta.id);
        logger.db(`Conta a receber criada: ${conta.id}`);
      }
    }

    logger.db(`✅ ${contasIds.length} conta(s) a receber criada(s) para proposta ${propostaId}`);
    return contasIds;
  } catch (error: any) {
    logger.error("Erro ao criar contas a receber a partir de proposta:", error);
    throw error;
  }
}

