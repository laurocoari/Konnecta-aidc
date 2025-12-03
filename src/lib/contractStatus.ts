import { logger } from "./logger";

export type ContractStatus = "ativo" | "vencendo" | "concluido" | "rescindido" | "rascunho" | "em_analise" | "aprovado" | "assinado" | "encerrado";

/**
 * Calcula o status do contrato baseado nas datas de início e fim
 * @param dataInicio Data de início do contrato (string ISO ou Date)
 * @param dataFim Data de fim do contrato (string ISO ou Date ou null)
 * @param statusAtual Status atual do contrato (para preservar status manuais como "rescindido")
 * @returns Status calculado
 */
export function calculateContractStatus(
  dataInicio: string | Date,
  dataFim: string | Date | null,
  statusAtual?: ContractStatus
): ContractStatus {
  // Se o status atual é manual (não calculado), preservar
  if (statusAtual && ["rescindido", "rascunho", "em_analise", "aprovado", "assinado"].includes(statusAtual)) {
    return statusAtual;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = new Date(dataInicio);
  inicio.setHours(0, 0, 0, 0);

  // Se não tem data fim, considerar ativo se já iniciou
  if (!dataFim) {
    if (inicio <= hoje) {
      return "ativo";
    }
    return "rascunho";
  }

  const fim = new Date(dataFim);
  fim.setHours(0, 0, 0, 0);

  // Contrato ainda não iniciou
  if (hoje < inicio) {
    return "rascunho";
  }

  // Contrato já terminou
  if (hoje > fim) {
    return "concluido";
  }

  // Contrato está dentro do período de vigência
  // Verificar se está vencendo (menos de 30 dias para o fim)
  const diasRestantes = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes <= 30 && diasRestantes > 0) {
    return "vencendo";
  }

  return "ativo";
}

/**
 * Calcula a próxima data de vencimento para contratos de locação
 * @param dataInicio Data de início do contrato
 * @param dataFim Data de fim do contrato (opcional)
 * @param valorMensal Se tem valor mensal, significa que é locação
 * @returns Próxima data de vencimento ou null
 */
export function calculateProximoVencimento(
  dataInicio: string | Date,
  dataFim: string | Date | null,
  valorMensal: number | null
): string | null {
  // Apenas para contratos de locação (que têm valor_mensal)
  if (!valorMensal) {
    return null;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = new Date(dataInicio);
  inicio.setHours(0, 0, 0, 0);

  // Se ainda não iniciou, retornar data de início
  if (hoje < inicio) {
    return inicio.toISOString().split("T")[0];
  }

  // Se tem data fim e já passou, retornar null
  if (dataFim) {
    const fim = new Date(dataFim);
    fim.setHours(0, 0, 0, 0);
    if (hoje > fim) {
      return null;
    }
  }

  // Calcular próximo vencimento (dia do mês baseado na data de início)
  const diaVencimento = inicio.getDate();
  const proximoVencimento = new Date(hoje);
  
  // Se o dia do vencimento já passou este mês, usar próximo mês
  if (hoje.getDate() >= diaVencimento) {
    proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);
  }
  
  proximoVencimento.setDate(diaVencimento);

  // Se tem data fim e o próximo vencimento ultrapassa, usar data fim
  if (dataFim) {
    const fim = new Date(dataFim);
    fim.setHours(0, 0, 0, 0);
    if (proximoVencimento > fim) {
      return fim.toISOString().split("T")[0];
    }
  }

  return proximoVencimento.toISOString().split("T")[0];
}

/**
 * Atualiza o status de um contrato se necessário
 * @param contractId ID do contrato
 * @param dataInicio Data de início
 * @param dataFim Data de fim
 * @param statusAtual Status atual
 * @returns Novo status ou null se não precisa atualizar
 */
export function shouldUpdateStatus(
  dataInicio: string | Date,
  dataFim: string | Date | null,
  statusAtual: ContractStatus
): ContractStatus | null {
  const novoStatus = calculateContractStatus(dataInicio, dataFim, statusAtual);
  
  // Só atualizar se o status mudou e não é um status manual
  if (novoStatus !== statusAtual && !["rescindido", "rascunho", "em_analise", "aprovado", "assinado"].includes(statusAtual)) {
    return novoStatus;
  }

  return null;
}

