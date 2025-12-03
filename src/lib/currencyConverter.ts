/**
 * Utilitário para conversão de moedas
 */

/**
 * Converte um valor de uma moeda para outra
 * @param valor - Valor a ser convertido
 * @param moedaOrigem - Moeda de origem ('BRL' ou 'USD')
 * @param moedaDestino - Moeda de destino ('BRL' ou 'USD')
 * @param taxaCambio - Taxa de câmbio (obrigatória se conversão envolver USD)
 * @returns Valor convertido
 */
export function converterMoeda(
  valor: number,
  moedaOrigem: string,
  moedaDestino: string,
  taxaCambio: number
): number {
  // Se as moedas são iguais, retorna o valor original
  if (moedaOrigem === moedaDestino) {
    return valor;
  }

  // Se origem é USD e destino é BRL
  if (moedaOrigem === "USD" && moedaDestino === "BRL") {
    if (!taxaCambio || taxaCambio <= 0) {
      throw new Error("Taxa de câmbio é obrigatória para conversão USD → BRL");
    }
    return valor * taxaCambio;
  }

  // Se origem é BRL e destino é USD
  if (moedaOrigem === "BRL" && moedaDestino === "USD") {
    if (!taxaCambio || taxaCambio <= 0) {
      throw new Error("Taxa de câmbio é obrigatória para conversão BRL → USD");
    }
    return valor / taxaCambio;
  }

  // Caso não suportado
  throw new Error(
    `Conversão não suportada: ${moedaOrigem} → ${moedaDestino}`
  );
}

/**
 * Formata um valor monetário para exibição
 * @param valor - Valor a ser formatado
 * @param moeda - Moeda ('BRL' ou 'USD')
 * @returns String formatada (ex: "R$ 1.234,56" ou "US$ 1,234.56")
 */
export function formatarMoeda(valor: number, moeda: string): string {
  if (moeda === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  }

  // Padrão BRL
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Calcula o custo convertido para BRL
 * @param custoOriginal - Custo original
 * @param moeda - Moeda original ('BRL' ou 'USD')
 * @param taxaCambio - Taxa de câmbio (se moeda for USD)
 * @returns Custo em BRL
 */
export function calcularCustoBRL(
  custoOriginal: number,
  moeda: string,
  taxaCambio: number | null
): number {
  if (moeda === "BRL") {
    return custoOriginal;
  }

  if (moeda === "USD") {
    if (!taxaCambio || taxaCambio <= 0) {
      throw new Error("Taxa de câmbio é obrigatória para conversão USD → BRL");
    }
    return custoOriginal * taxaCambio;
  }

  throw new Error(`Moeda não suportada: ${moeda}`);
}

/**
 * Calcula média ponderada de custos de múltiplas cotações
 * @param itens - Array de itens com custo, quantidade e moeda
 * @param taxaCambio - Taxa de câmbio padrão (se necessário)
 * @returns Média ponderada em BRL
 */
export function calcularMediaPonderada(
  itens: Array<{
    custo: number;
    quantidade: number;
    moeda: string;
    taxaCambio?: number | null;
  }>,
  taxaCambio: number | null = null
): number {
  if (itens.length === 0) {
    return 0;
  }

  let totalPonderado = 0;
  let totalQuantidade = 0;

  for (const item of itens) {
    const custoBRL = calcularCustoBRL(
      item.custo,
      item.moeda,
      item.taxaCambio || taxaCambio
    );
    totalPonderado += custoBRL * item.quantidade;
    totalQuantidade += item.quantidade;
  }

  if (totalQuantidade === 0) {
    return 0;
  }

  return totalPonderado / totalQuantidade;
}





