/**
 * Utilitário de Logging para Desenvolvimento
 * Logs estruturados e agrupados que só aparecem em modo desenvolvimento
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Log padronizado para desenvolvimento
 */
export const devLog = (
  msg: string,
  data?: any,
  level: 'log' | 'warn' | 'error' = 'log'
) => {
  if (!isDevelopment) return;

  const prefix = {
    log: '📦',
    warn: '⚠️',
    error: '❌',
  }[level];

  console[level](`${prefix} ${msg}`, data || '');
};

/**
 * Log agrupado para produtos filtrados
 */
export const devLogProdutoFiltrado = (
  motivo: string,
  produto: {
    nome?: string;
    codigo?: string;
    tipo_disponibilidade?: string;
    tipo_operacao_ativa?: string;
    [key: string]: any;
  },
  localizacao?: string
) => {
  if (!isDevelopment) return;

  console.groupCollapsed(`❌ Produto ignorado: ${motivo}`);
  console.log('🔎 Produto:', {
    nome: produto.nome,
    codigo: produto.codigo,
    tipo_disponibilidade: produto.tipo_disponibilidade,
    tipo_operacao_ativa: produto.tipo_operacao_ativa,
  });
  if (localizacao) {
    console.trace(`📍 ${localizacao}`);
  }
  console.groupEnd();
};

/**
 * Log de início de processo
 */
export const devLogInicio = (processo: string, dados?: any) => {
  if (!isDevelopment) return;
  console.log(
    `%c🔄 Iniciando ${processo}...`,
    'color: cyan; font-weight: bold',
    dados || ''
  );
};

/**
 * Log de sucesso
 */
export const devLogSucesso = (mensagem: string, dados?: any) => {
  if (!isDevelopment) return;
  console.log(
    `%c✅ ${mensagem}`,
    'color: green; font-weight: bold',
    dados || ''
  );
};

/**
 * Log de aviso
 */
export const devLogAviso = (mensagem: string, dados?: any) => {
  if (!isDevelopment) return;
  console.warn(
    `%c⚠️ ${mensagem}`,
    'color: orange; font-weight: bold',
    dados || ''
  );
};

/**
 * Log de erro
 */
export const devLogErro = (mensagem: string, erro?: any) => {
  if (!isDevelopment) return;
  console.error(
    `%c❌ ${mensagem}`,
    'color: red; font-weight: bold',
    erro || ''
  );
  if (erro && erro.stack) {
    console.error('%cStack:', 'color: #ef4444; font-weight: bold;', erro.stack);
  }
};

/**
 * Log agrupado de filtro de produtos
 */
export const devLogFiltroProdutos = (
  totalProdutos: number,
  produtosFiltrados: number,
  termoBusca?: string,
  detalhes?: {
    produtosQuePassamBusca?: number;
    produtosQuePassamTipo?: number;
    produtosIgnorados?: Array<{
      nome?: string;
      codigo?: string;
      motivo: string;
    }>;
  }
) => {
  if (!isDevelopment) return;

  const titulo = termoBusca
    ? `🔍 Filtro aplicado: ${totalProdutos} produtos -> ${produtosFiltrados} filtrados para "${termoBusca}"`
    : `🔍 Filtro aplicado: ${totalProdutos} produtos -> ${produtosFiltrados} filtrados`;

  console.groupCollapsed(titulo);
  
  if (detalhes) {
    if (detalhes.produtosQuePassamBusca !== undefined) {
      console.log(
        `%c📊 Produtos que passam no filtro de busca: ${detalhes.produtosQuePassamBusca}`,
        'color: #06b6d4'
      );
    }
    if (detalhes.produtosQuePassamTipo !== undefined) {
      console.log(
        `%c📊 Produtos que passam no filtro de tipo_disponibilidade: ${detalhes.produtosQuePassamTipo}`,
        'color: #06b6d4'
      );
    }
    if (detalhes.produtosIgnorados && detalhes.produtosIgnorados.length > 0) {
      console.log('❌ Produtos ignorados:', detalhes.produtosIgnorados);
    }
  }
  
  console.groupEnd();
};

