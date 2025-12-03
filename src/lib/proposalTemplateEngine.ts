/**
 * Sistema de processamento de variáveis dinâmicas para templates de proposta
 * Suporta variáveis do tipo {{variavel.campo}} e processa templates HTML
 */

export interface ProposalData {
  empresa: {
    nome?: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    logo_url?: string;
  };
  cliente: {
    nome?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    pessoa_contato?: string;
    telefone?: string;
    email?: string;
  };
  proposta: {
    numero?: string;
    versao?: number;
    data_emissao?: string;
    validade?: string;
  };
  responsavel: {
    nome?: string;
    email?: string;
  };
  itens: Array<{
    descricao: string;
    codigo?: string;
    unidade?: string;
    quantidade: number;
    preco_lista?: number;
    desconto?: number;
    preco_unitario: number;
    total: number;
  }>;
  totais: {
    total_itens?: number;
    soma_quantidades?: number;
    desconto_total?: number;
    subtotal?: number;
    frete?: number;
    outras_despesas?: number;
    total_geral: number;
  };
  custom?: Record<string, any>;
}

/**
 * Processa um template HTML substituindo variáveis pelos valores fornecidos
 * @param template Template HTML com variáveis no formato {{variavel.campo}}
 * @param data Dados da proposta para substituição
 * @returns HTML processado com variáveis substituídas
 */
export function processTemplateVariables(
  template: string,
  data: ProposalData
): string {
  let processed = template;

  // Processar variáveis de empresa
  if (data.empresa) {
    processed = processed.replace(/\{\{empresa\.nome\}\}/g, data.empresa.nome || '');
    processed = processed.replace(/\{\{empresa\.cnpj\}\}/g, data.empresa.cnpj || '');
    processed = processed.replace(/\{\{empresa\.endereco\}\}/g, data.empresa.endereco || '');
    processed = processed.replace(/\{\{empresa\.telefone\}\}/g, data.empresa.telefone || '');
    processed = processed.replace(/\{\{empresa\.email\}\}/g, data.empresa.email || '');
    processed = processed.replace(/\{\{empresa\.logo_url\}\}/g, data.empresa.logo_url || '');
  }

  // Processar variáveis de cliente
  if (data.cliente) {
    processed = processed.replace(/\{\{cliente\.nome\}\}/g, data.cliente.nome || '');
    processed = processed.replace(/\{\{cliente\.cnpj\}\}/g, data.cliente.cnpj || '');
    processed = processed.replace(/\{\{cliente\.endereco\}\}/g, data.cliente.endereco || '');
    processed = processed.replace(/\{\{cliente\.cidade\}\}/g, data.cliente.cidade || '');
    processed = processed.replace(/\{\{cliente\.estado\}\}/g, data.cliente.estado || '');
    processed = processed.replace(/\{\{cliente\.pessoa_contato\}\}/g, data.cliente.pessoa_contato || '');
    processed = processed.replace(/\{\{cliente\.telefone\}\}/g, data.cliente.telefone || '');
    processed = processed.replace(/\{\{cliente\.email\}\}/g, data.cliente.email || '');
  }

  // Processar variáveis de proposta
  if (data.proposta) {
    processed = processed.replace(/\{\{proposta\.numero\}\}/g, data.proposta.numero || '');
    processed = processed.replace(/\{\{proposta\.versao\}\}/g, String(data.proposta.versao || 1));
    processed = processed.replace(/\{\{proposta\.data_emissao\}\}/g, formatDate(data.proposta.data_emissao) || '');
    processed = processed.replace(/\{\{proposta\.validade\}\}/g, formatDate(data.proposta.validade) || '');
  }

  // Processar variáveis de responsável
  if (data.responsavel) {
    processed = processed.replace(/\{\{responsavel\.nome\}\}/g, data.responsavel.nome || '');
    processed = processed.replace(/\{\{responsavel\.email\}\}/g, data.responsavel.email || '');
  }

  // Processar variáveis de totais
  if (data.totais) {
    processed = processed.replace(/\{\{totais\.total_itens\}\}/g, formatNumber(data.totais.total_itens) || '0');
    processed = processed.replace(/\{\{totais\.soma_quantidades\}\}/g, formatNumber(data.totais.soma_quantidades) || '0');
    processed = processed.replace(/\{\{totais\.desconto_total\}\}/g, formatCurrency(data.totais.desconto_total) || 'R$ 0,00');
    processed = processed.replace(/\{\{totais\.subtotal\}\}/g, formatCurrency(data.totais.subtotal) || 'R$ 0,00');
    processed = processed.replace(/\{\{totais\.frete\}\}/g, formatCurrency(data.totais.frete) || 'R$ 0,00');
    processed = processed.replace(/\{\{totais\.outras_despesas\}\}/g, formatCurrency(data.totais.outras_despesas) || 'R$ 0,00');
    processed = processed.replace(/\{\{totais\.total_geral\}\}/g, formatCurrency(data.totais.total_geral) || 'R$ 0,00');
  }

  // Processar variáveis customizadas
  if (data.custom) {
    Object.keys(data.custom).forEach((key) => {
      const regex = new RegExp(`\\{\{custom\\.${key}\}\}`, 'g');
      processed = processed.replace(regex, String(data.custom![key] || ''));
    });
  }

  // Processar tabela de itens
  if (data.itens && data.itens.length > 0) {
    const itemsTable = generateItemsTable(data.itens);
    processed = processed.replace(/\{\{itens\.tabela\}\}/g, itemsTable);
  } else {
    processed = processed.replace(/\{\{itens\.tabela\}\}/g, '<p>Nenhum item adicionado.</p>');
  }

  return processed;
}

/**
 * Gera HTML da tabela de itens
 */
function generateItemsTable(items: ProposalData['itens']): string {
  const rows = items.map((item) => {
    const precoLista = item.preco_lista || item.preco_unitario / (1 - (item.desconto || 0) / 100);
    return `
      <tr>
        <td>${escapeHtml(item.descricao)}</td>
        <td>${escapeHtml(item.codigo || '-')}</td>
        <td>${escapeHtml(item.unidade || 'un')}</td>
        <td class="text-right">${item.quantidade}</td>
        <td class="text-right">${formatCurrency(precoLista)}</td>
        <td class="text-right">${(item.desconto || 0).toFixed(2)}%</td>
        <td class="text-right">${formatCurrency(item.preco_unitario)}</td>
        <td class="text-right">${formatCurrency(item.total)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="items-table">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Código</th>
          <th>Unidade</th>
          <th class="text-right">Qtde</th>
          <th class="text-right">Preço Lista</th>
          <th class="text-right">Desconto %</th>
          <th class="text-right">Preço Unitário</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Formata valor como moeda brasileira
 */
function formatCurrency(value: number | undefined | null): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata data no formato brasileiro
 */
function formatDate(date: string | undefined | null): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return date;
  }
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  if (typeof window === 'undefined') {
    // Server-side: usar replace simples
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  // Client-side: usar DOM
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Valida se todas as variáveis obrigatórias estão preenchidas
 */
export function validateTemplateVariables(
  template: string,
  data: ProposalData
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  const requiredVars = [
    'empresa.nome',
    'cliente.nome',
    'proposta.numero',
    'totais.total_geral',
  ];

  requiredVars.forEach((varPath) => {
    const [category, field] = varPath.split('.');
    const categoryData = (data as any)[category];
    if (!categoryData || !categoryData[field]) {
      missing.push(`{{${varPath}}}`);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Extrai todas as variáveis do template
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)]; // Remove duplicatas
}

