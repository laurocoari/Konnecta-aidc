import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const condicoesHTML = data.condicoes_comerciais?.texto || 
    'Condições comerciais a serem definidas conforme negociação.';

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
        <tr class="total-row">
          <td>TOTAL GERAL:</td>
          <td style="text-align: right;">${formatCurrency(data.total_geral)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="section" style="clear: both;">
    <div class="section-title">CONDIÇÕES COMERCIAIS</div>
    <div class="conditions">
${condicoesHTML}
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { proposalId } = await req.json();

    console.log('Generating PDF for proposal:', proposalId);

    // Buscar dados da proposta
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        cliente:clients(*),
        items:proposal_items(*)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError) throw proposalError;

    // Gerar HTML
    const html = generateHTML({
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
        codigo: item.codigo,
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
      const { data: tokenData } = await supabase.rpc('generate_proposal_token');
      token = tokenData;
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
