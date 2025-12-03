import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para descriptografar API key (simplificada - em produção usar criptografia real)
function decryptApiKey(encrypted: string): string {
  // TODO: Implementar descriptografia real
  return encrypted;
}

// Função para limitar tamanho do texto (otimização)
function truncateText(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "... [texto truncado para otimização]";
}

// Função para chamar OpenAI com timeout e otimizações
async function callOpenAI(
  apiKey: string,
  model: string,
  maxTokens: number,
  textoCotacao: string
) {
  try {
    // Limitar tamanho do texto para evitar custos e lentidão
    const textoLimitado = truncateText(textoCotacao, 8000);

    // Prompt avançado com raciocínio contextual de produto principal e acessórios
    const prompt = `Você é um analista profissional de cotações com conhecimento profundo do mercado de tecnologia (Zebra, Urovo, Honeywell, Sunmi, Elgin, TSC, etc).

Analise o texto e identifique usando RACIOCÍNIO CONTEXTUAL:

1. PRODUTO PRINCIPAL (obrigatório se houver):
   - Identifique o código/nome base do produto principal (ex: CT48, ZT231, CT60, etc)
   - Se encontrar código de produto (ex: "17 ct48"), identifique "ct48" como produto principal
   - Use seu conhecimento para completar o nome completo (ex: CT48 → Urovo CT48 Mobile Computer Android 11)
   - Se não souber o nome completo, deixe o código identificado

2. ITENS RELACIONADOS (acessórios do produto principal):
   - Se houver itens genéricos como "bateria", "carregador", "fonte", "cabo", "docking", "coldre", "cradle"
   - Associe automaticamente ao produto principal identificado
   - Complete o nome: "Bateria para CT48", "Carregador 4 POS para CT48", etc
   - Categoria: "acessorio_de_produto_principal"

3. TIPO DA COTAÇÃO:
   - COMPRA_DIRETA: Sem cliente final, sem faturamento direto
   - VENDA_AGENCIAVEL: Com cliente final ou faturamento direto
   - LOCACAO_AGENCIAVEL: Palavras de locação + cliente final

4. NÚMEROS:
   - proposta_numero, pedido_numero

5. CLIENTE FINAL (se existir)

6. MOEDA (CRÍTICO):
   - Se os valores estão em dólar (US$, USD, $), retorne "USD"
   - Se os valores estão em real (R$, BRL, Reais), retorne "BRL"
   - IMPORTANTE: Os valores de preco_unitario devem ser mantidos na moeda original
   - Se encontrar "US$960.00", o preco_unitario deve ser 960.00 (não convertido)
   - Se encontrar "R$ 4.800,00", o preco_unitario deve ser 4800.00 (não convertido)

Retorne SEMPRE em JSON neste formato:

{
  "tipo_cotacao": "COMPRA_DIRETA" | "VENDA_AGENCIAVEL" | "LOCACAO_AGENCIAVEL",
  "proposta_numero": "",
  "pedido_numero": "",
  "faturamento_direto": true/false,
  "cliente_final": {
    "nome": "",
    "cnpj": "",
    "endereco": "",
    "bairro": "",
    "cidade": "",
    "uf": "",
    "cep": "",
    "ie": ""
  },
  "produto_principal": {
    "codigo": "",
    "nome_completo": "",
    "quantidade": 0,
    "preco_unitario": 0,
    "preco_total": 0
  },
  "itens_relacionados": [
    {
      "nome": "",
      "nome_completo": "",
      "tipo_relacao": "acessorio_de_produto_principal",
      "quantidade": 0,
      "preco_unitario": 0,
      "preco_total": 0
    }
  ],
  "itens": [
    {
      "part_number": "",
      "descricao": "",
      "nome_completo": "",
      "ncm": "",
      "quantidade": 0,
      "preco_unitario": 0,
      "total": 0,
      "imediato": false,
      "is_produto_principal": false,
      "is_acessorio": false,
      "produto_principal_codigo": ""
    }
  ],
  "distribuidor": "",
  "revenda": "",
  "condicao_pagamento": "",
  "transportadora": "",
  "moeda": "BRL ou USD"
}

REGRAS IMPORTANTES:
- Se identificar produto principal, marque o item correspondente com "is_produto_principal": true
- Se identificar acessórios, marque com "is_acessorio": true e "produto_principal_codigo": "codigo_do_principal"
- Complete "nome_completo" usando seu conhecimento do mercado
- Se item for genérico (bateria, carregador), associe ao produto principal automaticamente
- MOEDA: Se encontrar valores com "US$", "$" ou "USD", retorne "USD". Se encontrar "R$" ou "BRL", retorne "BRL"
- VALORES: Mantenha os valores EXATAMENTE como aparecem na cotação. Se está "US$960.00", preco_unitario = 960.00 (não converta)

Agora analise o texto abaixo:

${textoLimitado}`;

    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos timeout

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content:
                "Você extrai dados de cotações. Retorne APENAS JSON válido, sem comentários. Sempre inclua os campos: tipo_cotacao, proposta_numero, pedido_numero, faturamento_direto e cliente_final, mesmo que sejam null/vazios.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: Math.min(maxTokens, 2000),
          temperature: 0.1,
          response_format: {
            type: "json_object",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `OpenAI API error: ${errorData.error?.message || response.statusText}`,
        };
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      const tokens = data.usage?.total_tokens;

      if (!content) {
        return {
          success: false,
          error: "Resposta vazia da OpenAI",
        };
      }

      // Parsear JSON de forma otimizada
      let parsed: any;
      try {
        let cleanContent = content.trim();
        // Remover markdown se existir
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
        }
        parsed = JSON.parse(cleanContent);

        // Validação rápida
        if (!parsed.itens || !Array.isArray(parsed.itens)) {
          return {
            success: false,
            error: "Estrutura JSON inválida: campo 'itens' não encontrado",
          };
        }
      } catch (e) {
        // Tentar extrair JSON do texto
        const jsonMatch = content.match(/\{[\s\S]*\}/s);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.itens || !Array.isArray(parsed.itens)) {
              return {
                success: false,
                error: "Estrutura JSON inválida",
              };
            }
          } catch (parseError) {
            return {
              success: false,
              error: "Não foi possível extrair JSON válido",
            };
          }
        } else {
          return {
            success: false,
            error: "Não foi possível extrair JSON válido",
          };
        }
      }

      return {
        success: true,
        data: parsed,
        tokens,
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return {
          success: false,
          error: "Timeout ao chamar OpenAI API (25s)",
        };
      }
      throw fetchError;
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro ao chamar OpenAI API",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração do servidor incompleta",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obter token do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token de autenticação não fornecido",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Usuário não autenticado",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { texto_cotacao } = await req.json();

    if (!texto_cotacao || typeof texto_cotacao !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Texto da cotação é obrigatório",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar configuração OpenAI (com cache implícito do Supabase)
    const { data: config, error: configError } = await supabaseAdmin
      .from("openai_config")
      .select("*")
      .eq("enabled", true)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração da OpenAI não encontrada ou desabilitada",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Descriptografar API key
    const apiKey = decryptApiKey(config.api_key_encrypted);
    const startTime = Date.now();

    // Chamar OpenAI
    const result = await callOpenAI(apiKey, config.model, config.max_tokens, texto_cotacao);
    const processingTime = Date.now() - startTime;

    // Preparar resposta ANTES de salvar log (não bloquear resposta)
    let responseData: any;

    if (!result.success) {
      responseData = {
        success: false,
        error: result.error,
      };
    } else {
      // Validar e limpar dados de forma otimizada
      const extractedData = result.data;
      
      // Processar produto principal
      const produtoPrincipal = extractedData.produto_principal || {};
      const produtoPrincipalCodigo = produtoPrincipal.codigo || "";
      
      // Processar itens (pode vir de "itens" ou "itens_relacionados")
      const items = Array.isArray(extractedData.itens) ? extractedData.itens : [];
      const itensRelacionados = Array.isArray(extractedData.itens_relacionados) 
        ? extractedData.itens_relacionados 
        : [];
      
      // Se produto principal não está nos itens, adicionar
      let allItems = [...items];
      
      // Verificar se produto principal já está nos itens
      const produtoPrincipalJaNosItens = items.some(
        (item: any) => item.is_produto_principal || 
        (produtoPrincipalCodigo && (
          item.descricao?.toLowerCase().includes(produtoPrincipalCodigo.toLowerCase()) ||
          item.part_number?.toLowerCase() === produtoPrincipalCodigo.toLowerCase()
        ))
      );
      
      // Se produto principal não está nos itens, adicionar
      if (produtoPrincipalCodigo && !produtoPrincipalJaNosItens && produtoPrincipal.quantidade > 0) {
        allItems.unshift({
          descricao: produtoPrincipal.nome_completo || produtoPrincipalCodigo,
          nome_completo: produtoPrincipal.nome_completo || produtoPrincipalCodigo,
          part_number: produtoPrincipalCodigo,
          quantidade: produtoPrincipal.quantidade || 0,
          preco_unitario: produtoPrincipal.preco_unitario || 0,
          total: produtoPrincipal.preco_total || produtoPrincipal.preco_unitario * produtoPrincipal.quantidade || 0,
          is_produto_principal: true,
          is_acessorio: false,
          produto_principal_codigo: produtoPrincipalCodigo,
        });
      }
      
      // Adicionar itens relacionados
      allItems = [
        ...allItems,
        ...itensRelacionados.map((item: any) => ({
          ...item,
          descricao: item.nome || item.descricao || "",
          nome_completo: item.nome_completo || item.nome || "",
          is_acessorio: true,
          produto_principal_codigo: produtoPrincipalCodigo,
        })),
      ];
      
      const cleanedItems = allItems
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => {
          // Usar nome_completo se disponível, senão descricao
          const descricaoFinal = item.nome_completo || item.descricao || item.nome_produto || "";
          
          return {
            part_number: item.part_number || item.partNumber || "",
            descricao: descricaoFinal,
            nome_completo: item.nome_completo || descricaoFinal,
            ncm: item.ncm || "",
            quantidade: parseFloat(item.quantidade) || 0,
            preco_unitario: parseFloat(item.preco_unitario) || 0,
            total: parseFloat(item.total) || parseFloat(item.preco_total) || 0,
            imediato: item.imediato === true || item.imediato === "true" || false,
            is_produto_principal: item.is_produto_principal === true || false,
            is_acessorio: item.is_acessorio === true || false,
            produto_principal_codigo: item.produto_principal_codigo || produtoPrincipalCodigo || "",
          };
        });

      // Processar faturamento direto
      const faturamentoDireto = extractedData.faturamento_direto === true;
      const clienteFinal = extractedData.cliente_final || {};

      // Determinar tipo de cotação (com validação)
      let tipoCotacao = extractedData.tipo_cotacao || "COMPRA_DIRETA";
      
      // Regra: Se houver cliente final, nunca é COMPRA_DIRETA
      if (faturamentoDireto && tipoCotacao === "COMPRA_DIRETA") {
        // Verificar se há palavras de locação
        const temLocacao = /locação|aluguel|rental|locar|contrato de locação/i.test(textoCotacao);
        tipoCotacao = temLocacao ? "LOCACAO_AGENCIAVEL" : "VENDA_AGENCIAVEL";
      }

      responseData = {
        success: true,
        tipo_cotacao: tipoCotacao,
        proposta_numero: extractedData.proposta_numero || extractedData.propostaNumero || "",
        pedido_numero: extractedData.pedido_numero || extractedData.pedidoNumero || "",
        faturamento_direto: faturamentoDireto,
        cliente_final: faturamentoDireto
          ? {
              nome: clienteFinal.nome || clienteFinal.nome_empresa || "",
              cnpj: clienteFinal.cnpj || "",
              endereco: clienteFinal.endereco || "",
              bairro: clienteFinal.bairro || "",
              cidade: clienteFinal.cidade || "",
              uf: clienteFinal.uf || "",
              cep: clienteFinal.cep || "",
              ie: clienteFinal.ie || "",
            }
          : null,
        produto_principal: produtoPrincipalCodigo
          ? {
              codigo: produtoPrincipalCodigo,
              nome_completo: produtoPrincipal.nome_completo || produtoPrincipalCodigo,
              quantidade: parseFloat(produtoPrincipal.quantidade) || 0,
              preco_unitario: parseFloat(produtoPrincipal.preco_unitario) || 0,
              preco_total: parseFloat(produtoPrincipal.preco_total) || 0,
            }
          : null,
        distribuidor: extractedData.distribuidor || "",
        revenda: extractedData.revenda || "",
        condicao_pagamento: extractedData.condicao_pagamento || "",
        transportadora: extractedData.transportadora || "",
        moeda: extractedData.moeda || "BRL",
        items: cleanedItems,
        processing_time_ms: processingTime,
      };
    }

    // Salvar log de forma ASSÍNCRONA (não bloquear resposta)
    supabaseAdmin
      .from("ai_interpretation_logs")
      .insert({
        user_id: user.id,
        texto_original: texto_cotacao.substring(0, 10000),
        json_extraido: result.success ? result.data : null,
        modelo_usado: config.model,
        tokens_usados: result.tokens || null,
        sucesso: result.success,
        erro: result.error || null,
        tempo_processamento_ms: processingTime,
      })
      .then(() => {
        console.log("Log salvo com sucesso");
      })
      .catch((err) => {
        console.error("Erro ao salvar log (não crítico):", err);
      });

    // Retornar resposta imediatamente (sem esperar log)
    return new Response(JSON.stringify(responseData), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in interpretar-cotacao:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

