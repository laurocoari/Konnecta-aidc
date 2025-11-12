import { useMemo } from 'react';

export interface ProposalItem {
  product_id: string;
  fornecedor_id?: string;
  quantidade: number;
  custo_unitario: number;
  valor_unitario: number;
  comissao_percentual?: number;
  periodo_locacao_meses?: number;
}

export interface ProposalCalculations {
  items: (ProposalItem & { valor_subtotal: number; lucro_subtotal: number })[];
  valor_total: number;
  custo_total: number;
  lucro_total: number;
  margem_percentual: number;
}

export const useProposalCalculations = (
  items: ProposalItem[],
  tipo_operacao: 'venda_direta' | 'venda_agenciada' | 'locacao_direta' | 'locacao_agenciada'
): ProposalCalculations => {
  return useMemo(() => {
    const calculations = items.map(item => {
      let valor_subtotal = 0;
      let lucro_subtotal = 0;
      let custo_subtotal = 0;
      
      const periodo = item.periodo_locacao_meses || 1;
      
      // Cálculo baseado no tipo de operação
      switch(tipo_operacao) {
        case 'venda_direta':
        case 'venda_agenciada':
          // Para vendas: valor * quantidade
          valor_subtotal = item.valor_unitario * item.quantidade;
          custo_subtotal = item.custo_unitario * item.quantidade;
          lucro_subtotal = valor_subtotal - custo_subtotal;
          break;
          
        case 'locacao_direta':
        case 'locacao_agenciada':
          // Para locações: valor mensal * quantidade * período
          valor_subtotal = item.valor_unitario * item.quantidade * periodo;
          custo_subtotal = item.custo_unitario * item.quantidade * periodo;
          lucro_subtotal = valor_subtotal - custo_subtotal;
          break;
      }

      return { 
        ...item, 
        valor_subtotal, 
        lucro_subtotal 
      };
    });
    
    const valor_total = calculations.reduce((sum, item) => sum + item.valor_subtotal, 0);
    const custo_total = calculations.reduce((sum, item) => sum + (item.custo_unitario * item.quantidade * (item.periodo_locacao_meses || 1)), 0);
    const lucro_total = valor_total - custo_total;
    // Margem sobre o custo (padrão comercial) - não sobre o valor de venda
    const margem_percentual = custo_total > 0 ? (lucro_total / custo_total) * 100 : 0;
    
    return {
      items: calculations,
      valor_total,
      custo_total,
      lucro_total,
      margem_percentual: Number(margem_percentual.toFixed(2))
    };
  }, [items, tipo_operacao]);
};

// Funções auxiliares de cálculo
export function calcularCustoLocacaoDireta(custoAquisicao: number, vidaUtilMeses: number): number {
  if (vidaUtilMeses <= 0) return 0;
  return custoAquisicao / vidaUtilMeses;
}

export function calcularValorComComissao(custo: number, comissao: number): number {
  return custo * (1 + comissao / 100);
}

export function calcularMargem(valor: number, custo: number): number {
  if (valor === 0) return 0;
  return ((valor - custo) / valor) * 100;
}

export function calcularValorComMargem(custo: number, margem: number): number {
  return custo * (1 + margem / 100);
}
