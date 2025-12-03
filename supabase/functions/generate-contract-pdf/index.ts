import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
}

function generateItemsTableHTML(items: any[]): string {
  if (!items || items.length === 0) {
    return '<p>Nenhum item cadastrado.</p>';
  }

  const rows = items.map((item: any) => `
    <tr>
      <td>${escapeHtml(item.descricao || '-')}</td>
      <td class="text-right">${item.quantidade || 0}</td>
      <td class="text-right">${formatCurrency(item.valor_unitario || 0)}</td>
      <td class="text-right">${formatCurrency(item.valor_total || 0)}</td>
    </tr>
  `).join('');

  return `
    <table class="items-table" style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background: #e5e7eb;">
          <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Descrição</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Quantidade</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Valor Unitário</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function processTemplateVariables(
  template: string,
  contract: any,
  cliente: any,
  items: any[]
): string {
  let html = template || '';

  // Variáveis do cliente
  html = html.replace(/\{\{cliente_nome\}\}/g, escapeHtml(cliente?.nome || ''));
  html = html.replace(/\{\{cliente_cnpj\}\}/g, escapeHtml(cliente?.cnpj || ''));
  html = html.replace(/\{\{cliente_endereco\}\}/g, escapeHtml(
    [cliente?.endereco, cliente?.cidade, cliente?.estado, cliente?.cep]
      .filter(Boolean)
      .join(', ') || ''
  ));
  html = html.replace(/\{\{cliente_email\}\}/g, escapeHtml(cliente?.email || ''));
  html = html.replace(/\{\{cliente_telefone\}\}/g, escapeHtml(cliente?.telefone || ''));

  // Variáveis do contrato
  html = html.replace(/\{\{contrato_numero\}\}/g, escapeHtml(contract.numero || ''));
  html = html.replace(/\{\{tipo\}\}/g, escapeHtml(
    contract.tipo === 'locacao' ? 'Locação' :
    contract.tipo === 'venda' ? 'Venda' :
    contract.tipo === 'comodato' ? 'Comodato' :
    contract.tipo === 'servico' ? 'Serviço' : contract.tipo || ''
  ));
  html = html.replace(/\{\{data_inicio\}\}/g, formatDate(contract.data_inicio));
  html = html.replace(/\{\{data_fim\}\}/g, formatDate(contract.data_fim));
  html = html.replace(/\{\{data_assinatura\}\}/g, formatDate(new Date().toISOString().split('T')[0]));
  html = html.replace(/\{\{valor_total\}\}/g, formatCurrency(contract.valor_total || 0));
  html = html.replace(/\{\{valor_mensal\}\}/g, contract.valor_mensal ? formatCurrency(contract.valor_mensal) : formatCurrency(0));

  // Tabela de itens
  const itemsTable = generateItemsTableHTML(items);
  html = html.replace(/\{\{itens\.tabela\}\}/g, itemsTable);

  return html;
}

function generateHTML(contract: any, modelo: any, cliente: any, items: any[]): string {
  // Se o modelo tem templates HTML, usar eles
  if (modelo?.cabecalho_html || modelo?.corpo_html || modelo?.rodape_html) {
    const cabecalho = modelo.cabecalho_html || '';
    const corpo = modelo.corpo_html || '';
    const rodape = modelo.rodape_html || '';

    const corpoProcessado = processTemplateVariables(corpo, contract, cliente, items);
    const cabecalhoProcessado = processTemplateVariables(cabecalho, contract, cliente, items);
    const rodapeProcessado = processTemplateVariables(rodape, contract, cliente, items);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 20mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000;
      padding: 20mm;
      line-height: 1.6;
      width: 210mm; /* Largura A4 retrato */
      min-height: 297mm; /* Altura A4 retrato */
      margin: 0 auto;
      background: #ffffff;
    }
    .header { margin-bottom: 30px; }
    .content { margin: 20px 0; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #1e40af; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    th { background: #e5e7eb; color: #000; padding: 10px 8px; text-align: left; font-weight: bold; border: 1px solid #d1d5db; }
    td { padding: 8px; border: 1px solid #d1d5db; }
    tr:nth-child(even) { background: #f9fafb; }
    .text-right { text-align: right; }
    @media print {
      body { 
        padding: 0;
        width: 100%;
        min-height: 100%;
      }
      @page { 
        size: A4 portrait;
        margin: 25mm 20mm; /* 25mm topo/rodapé, 20mm laterais */
      }
    }
  </style>
</head>
<body>
  ${cabecalhoProcessado}
  <div class="content">
    ${corpoProcessado}
  </div>
  ${rodapeProcessado}
</body>
</html>
    `;
  }

  // Template padrão se não houver modelo
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 25mm 20mm; /* 25mm topo/rodapé, 20mm laterais */
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000;
      padding: 0;
      line-height: 1.6;
      width: 100%;
      min-height: 100%;
      margin: 0;
      background: #ffffff;
    }
    .header {
      border-bottom: 3px solid #1e40af;
      padding-bottom: 20px;
      margin-bottom: 30px;
      padding-top: 10px;
    }
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .contract-title {
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
    .text-right {
      text-align: right;
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
      body { 
        padding: 0;
        width: 100%;
        min-height: 100%;
      }
      @page { 
        size: A4 portrait;
        margin: 25mm 20mm; /* 25mm topo/rodapé, 20mm laterais */
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">KONNECTA CONSULTORIA</div>
    <div style="font-size: 9pt; color: #666;">
      Rua Rio Ebro, Nº7, QD12<br>
      69090-643 – Manaus, AM<br>
      Telefone: (92) 3242-1311<br>
      CNPJ: 05.601.700/0001-55
    </div>
  </div>

  <div class="contract-title">
    CONTRATO DE ${contract.tipo === 'locacao' ? 'LOCAÇÃO' : contract.tipo === 'venda' ? 'VENDA' : contract.tipo?.toUpperCase() || ''} Nº ${contract.numero}
  </div>

  <div class="section">
    <div class="section-title">PARTES CONTRATANTES</div>
    <div class="client-info">
      <p><strong>LOCADOR/VENDEDOR:</strong> KONNECTA CONSULTORIA</p>
      <p><strong>CNPJ:</strong> 05.601.700/0001-55</p>
      <p><strong>LOCATÁRIO/COMPRADOR:</strong> ${cliente?.nome || ''}</p>
      <p><strong>CNPJ:</strong> ${cliente?.cnpj || ''}</p>
      ${cliente?.endereco ? `<p><strong>ENDEREÇO:</strong> ${cliente.endereco}, ${cliente.cidade || ''} - ${cliente.estado || ''}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">OBJETO DO CONTRATO</div>
    <p>O presente contrato tem por objeto a ${contract.tipo === 'locacao' ? 'locação' : contract.tipo === 'venda' ? 'venda' : contract.tipo} dos itens abaixo especificados.</p>
  </div>

  <div class="section">
    <div class="section-title">ITENS DO CONTRATO</div>
    ${generateItemsTableHTML(items)}
    <div style="margin-top: 20px; text-align: right;">
      <p><strong>Valor Total: ${formatCurrency(contract.valor_total || 0)}</strong></p>
      ${contract.valor_mensal ? `<p><strong>Valor Mensal: ${formatCurrency(contract.valor_mensal)}</strong></p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">PRAZO E VIGÊNCIA</div>
    <p><strong>Data de Início:</strong> ${formatDate(contract.data_inicio)}</p>
    ${contract.data_fim ? `<p><strong>Data de Término:</strong> ${formatDate(contract.data_fim)}</p>` : '<p><strong>Data de Término:</strong> A definir</p>'}
  </div>

  ${contract.observacoes ? `
  <div class="section">
    <div class="section-title">OBSERVAÇÕES</div>
    <p style="white-space: pre-wrap;">${escapeHtml(contract.observacoes)}</p>
  </div>
  ` : ''}

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[generate-contract-pdf] Variáveis de ambiente não configuradas');
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do servidor incompleta',
          details: 'Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parsear body
    let body;
    try {
      body = await req.json();
      console.log('[generate-contract-pdf] Body recebido:', JSON.stringify(body));
    } catch (e) {
      console.error('[generate-contract-pdf] Erro ao parsear body:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Body inválido ou vazio',
          details: e instanceof Error ? e.message : String(e)
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { contractId } = body || {};
    
    if (!contractId) {
      console.error('[generate-contract-pdf] contractId não fornecido. Body completo:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ 
          error: 'contractId obrigatório',
          details: 'O campo contractId não foi fornecido no corpo da requisição'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[generate-contract-pdf] Gerando PDF para contrato:', contractId);

    // 1) Buscar contrato + modelo + cliente
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        cliente:clients(*),
        modelo:contract_templates(*)
      `)
      .eq('id', contractId)
      .single();

    if (contractError) {
      console.error('[generate-contract-pdf] Erro ao buscar contrato:', contractError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar contrato',
          details: contractError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!contract) {
      console.error('[generate-contract-pdf] Contrato não encontrado:', contractId);
      return new Response(
        JSON.stringify({ 
          error: 'Contrato não encontrado'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar dados necessários
    if (!contract.cliente) {
      console.error('[generate-contract-pdf] Cliente não encontrado para o contrato:', contractId);
      return new Response(
        JSON.stringify({ 
          error: 'Cliente não encontrado para este contrato'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2) Buscar itens do contrato
    const { data: items, error: itemsError } = await supabase
      .from('contract_items')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.warn('[generate-contract-pdf] Erro ao carregar itens (continuando mesmo assim):', itemsError);
    }

    // 3) Montar HTML
    let html;
    try {
      html = generateHTML(
        contract,
        contract.modelo || null,
        contract.cliente,
        items || []
      );
    } catch (htmlError) {
      console.error('[generate-contract-pdf] Erro ao gerar HTML:', htmlError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno ao gerar PDF',
          details: htmlError instanceof Error ? htmlError.message : String(htmlError)
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Gerar token se não existir
    let token = contract.token_publico;
    if (!token) {
      token = crypto.randomUUID();
    }

    // Atualizar contrato com token e link público
    const linkPublico = `${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/contrato-publico?token=${token}`;
    
    try {
      await supabase
        .from('contracts')
        .update({
          token_publico: token,
          link_publico: linkPublico,
          pdf_url: null, // Será atualizado quando o PDF for gerado no frontend
        })
        .eq('id', contractId);
    } catch (updateError) {
      console.warn('[generate-contract-pdf] Erro ao atualizar contrato (continuando mesmo assim):', updateError);
    }

    // 4) Retornar HTML (o frontend gera o PDF)
    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        html,
        token,
        linkPublico,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[generate-contract-pdf] Erro interno', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorDetails = err instanceof Error ? err.stack : undefined;
    
    return new Response(
      JSON.stringify({
        error: 'Erro interno ao gerar PDF',
        details: errorMessage,
        ...(errorDetails && { stack: errorDetails }),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

