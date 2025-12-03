import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProposalData {
  codigo: string;
  versao: number;
  data_proposta: string;
  validade: string;
  introducao: string;
  total_itens: number;
  desconto_total: number;
  total_geral: number;
  despesas_adicionais: number;
  condicoes_comerciais: any;
  cliente: {
    nome: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
  };
  items: Array<{
    descricao: string;
    codigo: string;
    unidade: string;
    quantidade: number;
    preco_unitario: number;
    desconto: number;
    total: number;
  }>;
}

function generateHTMLFromTemplate(proposal: any, empresa: any, somaQuantidades: number, subtotal: number): string {
  // Processar template com variáveis dinâmicas
  let html = proposal.modelo.layout_html || '';
  
  // Substituir variáveis básicas
  html = html.replace(/\{\{empresa\.nome\}\}/g, empresa.nome);
  html = html.replace(/\{\{empresa\.cnpj\}\}/g, empresa.cnpj);
  html = html.replace(/\{\{empresa\.endereco\}\}/g, empresa.endereco);
  html = html.replace(/\{\{empresa\.telefone\}\}/g, empresa.telefone);
  html = html.replace(/\{\{empresa\.email\}\}/g, empresa.email);
  
  html = html.replace(/\{\{cliente\.nome\}\}/g, proposal.cliente.nome);
  html = html.replace(/\{\{cliente\.cnpj\}\}/g, proposal.cliente.cnpj || '');
  html = html.replace(/\{\{cliente\.endereco\}\}/g, proposal.cliente.endereco || '');
  html = html.replace(/\{\{cliente\.cidade\}\}/g, proposal.cliente.cidade || '');
  html = html.replace(/\{\{cliente\.estado\}\}/g, proposal.cliente.estado || '');
  
  html = html.replace(/\{\{proposta\.numero\}\}/g, proposal.codigo);
  html = html.replace(/\{\{proposta\.versao\}\}/g, String(proposal.versao));
  html = html.replace(/\{\{proposta\.data_emissao\}\}/g, new Date(proposal.data_proposta).toLocaleDateString('pt-BR'));
  html = html.replace(/\{\{proposta\.validade\}\}/g, new Date(proposal.validade).toLocaleDateString('pt-BR'));
  
  if (proposal.responsavel) {
    html = html.replace(/\{\{responsavel\.nome\}\}/g, proposal.responsavel.full_name || '');
    html = html.replace(/\{\{responsavel\.email\}\}/g, proposal.responsavel.email || '');
  }
  
  // Processar tabela de itens
  const itemsTable = generateItemsTableHTML(proposal.items);
  html = html.replace(/\{\{itens\.tabela\}\}/g, itemsTable);
  
  // Processar totais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  html = html.replace(/\{\{totais\.total_itens\}\}/g, String(proposal.items.length));
  html = html.replace(/\{\{totais\.soma_quantidades\}\}/g, String(somaQuantidades));
  html = html.replace(/\{\{totais\.desconto_total\}\}/g, formatCurrency(proposal.desconto_total || 0));
  html = html.replace(/\{\{totais\.subtotal\}\}/g, formatCurrency(subtotal));
  html = html.replace(/\{\{totais\.frete\}\}/g, formatCurrency(0));
  html = html.replace(/\{\{totais\.outras_despesas\}\}/g, formatCurrency(proposal.despesas_adicionais || 0));
  html = html.replace(/\{\{totais\.total_geral\}\}/g, formatCurrency(proposal.total_geral));
  
  // Adicionar CSS do modelo se existir
  if (proposal.modelo.css_personalizado) {
    html = html.replace('</head>', `<style>${proposal.modelo.css_personalizado}</style></head>`);
  }
  
  return html;
}

function generateItemsTableHTML(items: any[]): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const rows = items.map((item: any) => {
    const precoLista = item.preco_unitario / (1 - (item.desconto || 0) / 100);
    return `
      <tr>
        <td>${escapeHtml(item.descricao)}</td>
        <td>${escapeHtml(item.product?.codigo || item.codigo || '-')}</td>
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateHTML(data: ProposalData): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const itemsHTML = data.items.map(item => {
    const precoLista = item.preco_unitario / (1 - item.desconto / 100);
    return `
      <tr>
        <td>${item.descricao}</td>
        <td>${item.codigo || '-'}</td>
        <td>${item.unidade}</td>
        <td>${item.quantidade}</td>
        <td>${formatCurrency(precoLista)}</td>
        <td>${item.desconto.toFixed(2)}%</td>
        <td>${formatCurrency(item.preco_unitario)}</td>
        <td>${formatCurrency(item.total)}</td>
      </tr>
    `;
  }).join('');

  // Condições comerciais serão renderizadas diretamente no HTML

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #1e40af;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: start;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .company-details {
      font-size: 9pt;
      color: #666;
      line-height: 1.4;
    }
    .proposal-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      color: #1e40af;
      margin: 30px 0;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .client-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .client-info p {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
    }
    th {
      background: #e5e7eb;
      color: #000;
      padding: 10px 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #d1d5db;
    }
    td {
      padding: 8px;
      border: 1px solid #d1d5db;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .summary {
      margin-top: 20px;
      float: right;
      width: 350px;
    }
    .summary table {
      font-size: 10pt;
    }
    .summary td {
      padding: 8px 12px;
    }
    .summary .total-row {
      background: #1e40af !important;
      color: white;
      font-weight: bold;
      font-size: 11pt;
    }
    .conditions {
      clear: both;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #1e40af;
      margin: 20px 0;
      white-space: pre-wrap;
    }
    .validity {
      margin: 20px 0;
      padding: 10px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #1e40af;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    @media print {
      body { padding: 20px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="company-info">
        <div class="company-name">KONNECTA CONSULTORIA</div>
        <div class="company-details">
          <strong>FRANCY LAURO PACHECO PEREIRA</strong><br>
          Rua Rio Ebro, Nº7, QD12<br>
          69090-643 – Manaus, AM<br>
          Telefone: (92) 3242-1311<br>
          CNPJ: 05.601.700/0001-55
        </div>
      </div>
      <div style="text-align: right; font-size: 9pt;">
        <strong>Data de Emissão:</strong> ${formatDate(data.data_proposta)}<br>
        <strong>Validade:</strong> ${formatDate(data.validade)}
      </div>
    </div>
  </div>

  <div class="proposal-title">
    Proposta Comercial Nº ${data.codigo} - Versão ${data.versao}
  </div>

  <div class="section">
    <div class="section-title">PARA</div>
    <div class="client-info">
      <p><strong>Cliente:</strong> ${data.cliente.nome}</p>
      <p><strong>CNPJ:</strong> ${data.cliente.cnpj}</p>
      <p><strong>Endereço:</strong> ${data.cliente.endereco}</p>
      <p><strong>Cidade/UF:</strong> ${data.cliente.cidade}/${data.cliente.estado}</p>
    </div>
  </div>

  ${data.introducao ? `
  <div class="section">
    <div class="section-title">APRESENTAÇÃO</div>
    <p>${data.introducao}</p>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">ITENS DA PROPOSTA</div>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Código</th>
          <th>Un.</th>
          <th>Qtde</th>
          <th>Preço Lista</th>
          <th>Desc.</th>
          <th>Preço Unit.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="summary">
      <table>
        <tr>
          <td>Total de Itens:</td>
          <td style="text-align: right;">${data.items.length}</td>
        </tr>
        <tr>
          <td>Desconto Total:</td>
          <td style="text-align: right;">${formatCurrency(data.desconto_total || 0)}</td>
        </tr>
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right;">${formatCurrency(data.total_itens)}</td>
        </tr>
        <tr>
          <td>Despesas Adicionais:</td>
          <td style="text-align: right;">${formatCurrency(data.despesas_adicionais || 0)}</td>
        </tr>
        ${data.condicoes_comerciais?.tipo === "parcelado" && data.condicoes_comerciais?.acrescimo_percentual > 0 ? `
        <tr>
          <td>Acréscimo (${data.condicoes_comerciais.acrescimo_percentual}%):</td>
          <td style="text-align: right; color: #ea580c;">+${formatCurrency(
            ((data.total_itens - data.desconto_total + data.despesas_adicionais) * 
             data.condicoes_comerciais.acrescimo_percentual) / 100
          )}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>TOTAL GERAL:</td>
          <td style="text-align: right;">${formatCurrency(data.total_geral)}</td>
        </tr>
        ${data.condicoes_comerciais?.tipo === "parcelado" && data.condicoes_comerciais?.parcelas > 1 ? `
        <tr style="background: #dcfce7 !important; border-top: 2px solid #16a34a;">
          <td style="font-weight: bold; color: #16a34a;">Valor da Parcela (${data.condicoes_comerciais.parcelas}x):</td>
          <td style="text-align: right; font-weight: bold; color: #16a34a; font-size: 11pt;">${formatCurrency(data.total_geral / data.condicoes_comerciais.parcelas)}</td>
        </tr>
        ` : ''}
      </table>
    </div>
  </div>

  <div class="section" style="clear: both;">
    <div class="section-title">CONDIÇÕES COMERCIAIS</div>
    <div class="conditions">
      ${data.condicoes_comerciais?.tipo ? `
        <p><strong>Tipo de Pagamento:</strong> ${
          data.condicoes_comerciais.tipo === "avista" ? "À Vista" :
          data.condicoes_comerciais.tipo === "parcelado" ? "Parcelado" :
          "Nenhuma"
        }</p>
      ` : ''}
      ${data.condicoes_comerciais?.tipo === "parcelado" && data.condicoes_comerciais?.parcelas > 1 ? `
        <p><strong>Parcelas:</strong> ${data.condicoes_comerciais.parcelas}x de ${formatCurrency(data.total_geral / data.condicoes_comerciais.parcelas)}</p>
      ` : ''}
      ${data.condicoes_comerciais?.forma_pagamento ? `
        <p><strong>Forma de Pagamento:</strong> ${data.condicoes_comerciais.forma_pagamento}</p>
      ` : ''}
      ${data.condicoes_comerciais?.prazo_entrega ? `
        <p><strong>Prazo de Entrega:</strong> ${data.condicoes_comerciais.prazo_entrega}</p>
      ` : ''}
      ${data.condicoes_comerciais?.garantia ? `
        <p><strong>Garantia:</strong> ${data.condicoes_comerciais.garantia}</p>
      ` : ''}
      ${data.condicoes_comerciais?.texto ? `
        <p style="margin-top: 10px;">${data.condicoes_comerciais.texto}</p>
      ` : ''}
      ${!data.condicoes_comerciais?.texto && 
        !data.condicoes_comerciais?.tipo && 
        !data.condicoes_comerciais?.forma_pagamento ? `
        <p>Condições comerciais a serem definidas conforme negociação.</p>
      ` : ''}
    </div>
  </div>

  <div class="validity">
    <strong>⏰ Validade desta Proposta:</strong> ${formatDate(data.validade)} 
    (${Math.ceil((new Date(data.validade).getTime() - new Date(data.data_proposta).getTime()) / (1000 * 60 * 60 * 24))} dias)
  </div>

  <div class="footer">
    <p><strong>Konnecta Consultoria</strong> – Todos os direitos reservados</p>
    <p>Sistema CRM Konnecta – www.konnecta.com.br</p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { proposalId } = body;
    
    if (!proposalId) {
      throw new Error('proposalId é obrigatório');
    }

    console.log('Generating PDF for proposal:', proposalId);

    // Buscar dados da proposta com produtos e modelo para obter código interno
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        cliente:clients(*),
        modelo:proposal_templates(*),
        responsavel:profiles!proposals_responsavel_comercial_id_fkey(id, full_name, email),
        items:proposal_items(
          *,
          product:products(id, codigo)
        )
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError) throw proposalError;

    // Preparar dados da empresa (do modelo ou padrão)
    const empresa = proposal.modelo ? {
      nome: proposal.modelo.empresa_nome || 'Konnecta Consultoria',
      cnpj: proposal.modelo.empresa_cnpj || '05.601.700/0001-55',
      endereco: proposal.modelo.empresa_endereco || 'Rua Rio Ebro, Nº7, QD12',
      telefone: proposal.modelo.empresa_telefone || '(92) 3242-1311',
      email: proposal.modelo.empresa_email || '',
      logo_url: proposal.modelo.empresa_logo_url || '',
    } : {
      nome: 'Konnecta Consultoria',
      cnpj: '05.601.700/0001-55',
      endereco: 'Rua Rio Ebro, Nº7, QD12',
      telefone: '(92) 3242-1311',
      email: '',
      logo_url: '',
    };

    // Calcular totais
    const somaQuantidades = proposal.items.reduce((sum: number, item: any) => sum + item.quantidade, 0);
    const subtotal = proposal.total_itens;

    // Gerar HTML usando template do modelo se disponível, senão usar template padrão
    const html = proposal.modelo && proposal.modelo.layout_html
      ? generateHTMLFromTemplate(proposal, empresa, somaQuantidades, subtotal)
      : generateHTML({
          codigo: proposal.codigo,
          versao: proposal.versao,
          data_proposta: proposal.data_proposta,
          validade: proposal.validade,
          introducao: proposal.introducao,
          total_itens: proposal.total_itens,
          desconto_total: proposal.desconto_total,
          total_geral: proposal.total_geral,
          despesas_adicionais: proposal.despesas_adicionais,
          condicoes_comerciais: proposal.condicoes_comerciais,
          cliente: {
            nome: proposal.cliente.nome,
            cnpj: proposal.cliente.cnpj,
            endereco: proposal.cliente.endereco,
            cidade: proposal.cliente.cidade,
            estado: proposal.cliente.estado,
          },
          items: proposal.items.map((item: any) => ({
            descricao: item.descricao,
            codigo: item.product?.codigo || item.codigo || '-',
            unidade: item.unidade,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto: item.desconto,
            total: item.total,
          })),
        });

    // Gerar token se não existir
    let token = proposal.token_publico;
    if (!token) {
      // Gerar token aleatório se a função RPC não existir
      token = crypto.randomUUID();
    }

    // Atualizar proposta com token
    const linkPublico = `${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/proposta/${proposal.codigo}-v${proposal.versao}?token=${token}`;
    
    await supabase
      .from('proposals')
      .update({
        token_publico: token,
        link_publico: linkPublico,
      })
      .eq('id', proposalId);

    return new Response(
      JSON.stringify({
        success: true,
        html,
        token,
        linkPublico,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
