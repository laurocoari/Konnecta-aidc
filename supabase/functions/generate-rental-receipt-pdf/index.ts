import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReceiptData {
  numero_recibo: string;
  data_emissao: string;
  data_vencimento?: string;
  periodo_locacao_inicio?: string;
  periodo_locacao_fim?: string;
  numero_contrato?: string;
  total_geral: number;
  total_extenso?: string;
  observacoes?: string;
  cliente: {
    nome: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    ie?: string;
    telefone?: string;
    email?: string;
  };
  locador: {
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    telefone?: string;
    email?: string;
    inscricao_estadual?: string;
  };
  items: Array<{
    item: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    total: number;
  }>;
  bank_account?: {
    nome_banco: string;
    agencia: string;
    conta: string;
    razao_social_favorecido?: string;
    cnpj_favorecido?: string;
    chave_pix?: string;
  };
}

function currencyToWords(value: number): string {
  const unidades = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
  ];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (value === 0) return 'zero';
  if (value < 0) return 'menos ' + currencyToWords(Math.abs(value));

  function convertGroup(val: number): string {
    if (val === 0) return '';
    if (val === 100) return 'cem';
    let result = '';
    const c = Math.floor(val / 100);
    if (c > 0) {
      result += centenas[c];
      val = val % 100;
      if (val > 0) result += ' e ';
    }
    if (val < 20) {
      result += unidades[val];
    } else {
      const d = Math.floor(val / 10);
      const u = val % 10;
      result += dezenas[d];
      if (u > 0) result += ' e ' + unidades[u];
    }
    return result;
  }

  let result = '';
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);

  if (reais >= 1000000) {
    const milhoes = Math.floor(reais / 1000000);
    result += convertGroup(milhoes) + ' milhão';
    if (milhoes > 1) result += 'ões';
    const resto = reais % 1000000;
    if (resto > 0) result += ' ';
    if (resto >= 1000) {
      const milhares = Math.floor(resto / 1000);
      result += convertGroup(milhares) + ' mil';
      const final = resto % 1000;
      if (final > 0) result += ' ' + convertGroup(final);
    } else {
      result += convertGroup(resto);
    }
  } else if (reais >= 1000) {
    const milhares = Math.floor(reais / 1000);
    if (milhares === 1) {
      result += 'mil';
    } else {
      result += convertGroup(milhares) + ' mil';
    }
    const final = reais % 1000;
    if (final > 0) result += ' ' + convertGroup(final);
  } else {
    result += convertGroup(reais);
  }

  result += reais === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    if (reais > 0) result += ' e ';
    result += convertGroup(centavos);
    result += centavos === 1 ? ' centavo' : ' centavos';
  }

  return result || 'zero reais';
}

function generateHTML(data: ReceiptData): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const itemsHTML = data.items.map((item, index) => `
    <tr>
      <td style="text-align: center; padding: 8px; border: 1px solid #d1d5db;">${index + 1}</td>
      <td style="padding: 8px; border: 1px solid #d1d5db;">${item.descricao}</td>
      <td style="text-align: center; padding: 8px; border: 1px solid #d1d5db;">${item.quantidade}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #d1d5db;">${formatCurrency(item.valor_unitario)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #d1d5db;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  const bankAccountHTML = data.bank_account ? `
    <div style="margin-top: 30px; padding: 15px; background: #f0f9ff; border-left: 4px solid #1e40af; border-radius: 5px;">
      <h3 style="font-size: 12pt; font-weight: bold; color: #1e40af; margin-bottom: 10px;">DADOS BANCÁRIOS PARA PAGAMENTO</h3>
      <div style="font-size: 10pt; line-height: 1.6;">
        ${data.bank_account.razao_social_favorecido ? `<p><strong>Favorecido:</strong> ${data.bank_account.razao_social_favorecido}</p>` : ''}
        ${data.bank_account.cnpj_favorecido ? `<p><strong>CNPJ:</strong> ${data.bank_account.cnpj_favorecido}</p>` : ''}
        <p><strong>Banco:</strong> ${data.bank_account.nome_banco}</p>
        <p><strong>Agência:</strong> ${data.bank_account.agencia}</p>
        <p><strong>Conta:</strong> ${data.bank_account.conta}</p>
        ${data.bank_account.chave_pix ? `<p><strong>Chave PIX:</strong> ${data.bank_account.chave_pix}</p>` : ''}
      </div>
    </div>
  ` : '';

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
    .receipt-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      color: #1e40af;
      margin: 30px 0;
      text-transform: uppercase;
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
    .client-info, .locator-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .client-info p, .locator-info p {
      margin: 5px 0;
      font-size: 10pt;
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
    .total-section {
      margin-top: 20px;
      text-align: right;
    }
    .total-amount {
      font-size: 14pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .total-extenso {
      font-size: 10pt;
      color: #666;
      font-style: italic;
    }
    .legal-text {
      margin-top: 30px;
      padding: 15px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      font-size: 9pt;
      line-height: 1.6;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #1e40af;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    .observations {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #1e40af;
      font-size: 10pt;
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
        <div class="company-name">${data.locador.nome_fantasia || data.locador.razao_social}</div>
        <div class="company-details">
          <strong>${data.locador.razao_social}</strong><br>
          ${data.locador.endereco}<br>
          ${data.locador.cep} – ${data.locador.cidade}, ${data.locador.estado}<br>
          ${data.locador.telefone ? `Telefone: ${data.locador.telefone}<br>` : ''}
          ${data.locador.email ? `Email: ${data.locador.email}<br>` : ''}
          CNPJ: ${data.locador.cnpj}
          ${data.locador.inscricao_estadual ? `<br>IE: ${data.locador.inscricao_estadual}` : ''}
        </div>
      </div>
      <div style="text-align: right; font-size: 9pt;">
        <strong>Data de Emissão:</strong> ${formatDate(data.data_emissao)}<br>
        ${data.data_vencimento ? `<strong>Data de Vencimento:</strong> ${formatDate(data.data_vencimento)}<br>` : ''}
      </div>
    </div>
  </div>

  <div class="receipt-title">
    RECIBO DE LOCAÇÃO Nº ${data.numero_recibo}
  </div>

  <div class="section">
    <div class="section-title">DADOS DO LOCATÁRIO</div>
    <div class="client-info">
      <p><strong>Razão Social:</strong> ${data.cliente.nome}</p>
      <p><strong>CNPJ:</strong> ${data.cliente.cnpj}</p>
      <p><strong>Endereço:</strong> ${data.cliente.endereco}</p>
      <p><strong>Município/UF/CEP:</strong> ${data.cliente.cidade}/${data.cliente.estado} - ${data.cliente.cep}</p>
      ${data.cliente.ie ? `<p><strong>Inscrição Estadual:</strong> ${data.cliente.ie}</p>` : ''}
      ${data.cliente.telefone ? `<p><strong>Telefone:</strong> ${data.cliente.telefone}</p>` : ''}
      ${data.cliente.email ? `<p><strong>Email:</strong> ${data.cliente.email}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">DADOS DO RECIBO</div>
    <div style="font-size: 10pt; line-height: 1.8;">
      <p><strong>Número do Recibo:</strong> ${data.numero_recibo}</p>
      <p><strong>Data de Emissão:</strong> ${formatDate(data.data_emissao)}</p>
      ${data.data_vencimento ? `<p><strong>Data de Vencimento:</strong> ${formatDate(data.data_vencimento)}</p>` : ''}
      ${data.periodo_locacao_inicio ? `<p><strong>Período da Locação:</strong> ${formatDate(data.periodo_locacao_inicio)} até ${formatDate(data.periodo_locacao_fim || '')}</p>` : ''}
      ${data.numero_contrato ? `<p><strong>Nº do Contrato:</strong> ${data.numero_contrato}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">ITENS LOCADOS</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">Item</th>
          <th style="width: 45%;">Descrição</th>
          <th style="width: 10%; text-align: center;">Quantidade</th>
          <th style="width: 20%; text-align: right;">Valor Unitário</th>
          <th style="width: 20%; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
  </div>

  <div class="total-section">
    <div class="total-amount">
      Total Geral: ${formatCurrency(data.total_geral)}
    </div>
    <div class="total-extenso">
      ${data.total_extenso || currencyToWords(data.total_geral)}
    </div>
  </div>

  ${data.observacoes ? `
  <div class="observations">
    <strong>Observações:</strong><br>
    ${data.observacoes}
  </div>
  ` : ''}

  ${bankAccountHTML}

  <div class="legal-text">
    <strong>Informações Legais:</strong><br>
    Não haverá incidência de ISSQN conforme Lei nº 1008/2006 e Decreto 004304/2009.<br>
    Operação de locação de bens móveis, sem fornecimento de mão de obra, está dispensada da emissão de NFS-e por não incidência de ISSQN.
  </div>

  <div class="footer">
    <p><strong>${data.locador.nome_fantasia || data.locador.razao_social}</strong> – Todos os direitos reservados</p>
    <p>Sistema Konnecta – www.konnecta.com.br</p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
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
    const { receiptId } = body;
    
    if (!receiptId) {
      throw new Error('receiptId é obrigatório');
    }

    console.log('Generating PDF for rental receipt:', receiptId);

    // Buscar dados do recibo
    const { data: receipt, error: receiptError } = await supabase
      .from('rental_receipts')
      .select(`
        *,
        cliente:clients(*),
        items:rental_receipt_items(*),
        bank_account:bank_accounts(*)
      `)
      .eq('id', receiptId)
      .single();

    if (receiptError) throw receiptError;

    // Buscar dados da empresa (locador)
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Company settings not found, using defaults');
    }

    // Montar dados para o template
    const receiptData: ReceiptData = {
      numero_recibo: receipt.numero_recibo,
      data_emissao: receipt.data_emissao,
      data_vencimento: receipt.data_vencimento,
      periodo_locacao_inicio: receipt.periodo_locacao_inicio,
      periodo_locacao_fim: receipt.periodo_locacao_fim,
      numero_contrato: receipt.numero_contrato,
      total_geral: parseFloat(receipt.total_geral || 0),
      total_extenso: receipt.total_extenso,
      observacoes: receipt.observacoes,
      cliente: {
        nome: receipt.cliente.nome,
        cnpj: receipt.cliente.cnpj,
        endereco: receipt.cliente.endereco,
        cidade: receipt.cliente.cidade,
        estado: receipt.cliente.estado,
        cep: receipt.cliente.cep,
        ie: receipt.cliente.ie,
        telefone: receipt.cliente.telefone,
        email: receipt.cliente.email,
      },
      locador: companySettings ? {
        razao_social: companySettings.razao_social,
        nome_fantasia: companySettings.nome_fantasia,
        cnpj: companySettings.cnpj,
        endereco: companySettings.endereco,
        cidade: companySettings.cidade,
        estado: companySettings.estado,
        cep: companySettings.cep,
        telefone: companySettings.telefone,
        email: companySettings.email,
        inscricao_estadual: companySettings.inscricao_estadual,
      } : {
        razao_social: 'KONNECTA CONSULTORIA',
        cnpj: '05.601.700/0001-55',
        endereco: 'Rua Rio Ebro, Nº7, QD12',
        cidade: 'Manaus',
        estado: 'AM',
        cep: '69090-643',
        telefone: '(92) 3242-1311',
      },
      items: receipt.items.map((item: any) => ({
        item: item.item || '',
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: parseFloat(item.valor_unitario || 0),
        total: parseFloat(item.total || 0),
      })),
      bank_account: receipt.bank_account ? {
        nome_banco: receipt.bank_account.nome_banco,
        agencia: receipt.bank_account.agencia,
        conta: receipt.bank_account.conta,
        razao_social_favorecido: receipt.bank_account.razao_social_favorecido,
        cnpj_favorecido: receipt.bank_account.cnpj_favorecido,
        chave_pix: receipt.bank_account.chave_pix,
      } : undefined,
    };

    // Gerar HTML
    const html = generateHTML(receiptData);

    // Gerar token se não existir
    let token = receipt.token_publico;
    if (!token) {
      token = crypto.randomUUID();
    }

    // Atualizar recibo com token
    const linkPublico = `${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/recibo/${receipt.numero_recibo}?token=${token}`;
    
    await supabase
      .from('rental_receipts')
      .update({
        token_publico: token,
        link_publico: linkPublico,
      })
      .eq('id', receiptId);

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

