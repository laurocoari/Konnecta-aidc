import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role para bypass RLS
    // No Supabase Edge Functions, as variáveis são fornecidas automaticamente
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Variáveis de ambiente não configuradas:", {
        SUPABASE_URL: supabaseUrl || "NÃO ENCONTRADO",
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? "ENCONTRADO" : "NÃO ENCONTRADO",
        todas_envs: Object.keys(Deno.env.toObject()).filter(k => k.includes("SUPABASE")),
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Configuração do servidor incompleta. Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Criando cliente Supabase com URL:", supabaseUrl.substring(0, 30) + "...");
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { user_id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado } =
      await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "user_id e email são obrigatórios" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Tentar inserir registro de parceiro com retry logic
    // O usuário pode não estar disponível imediatamente após criação no auth
    const maxRetries = 5;
    const retryDelay = 1000; // 1 segundo base
    let data = null;
    let error = null;
    let success = false;

    const partnerData = {
      user_id,
      nome_fantasia,
      razao_social,
      cnpj: cnpj?.replace(/\D/g, "") || null,
      email,
      telefone,
      cidade,
      estado: estado?.toUpperCase() || null,
      approval_status: "pendente",
      status: "inativo",
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await supabaseAdmin
        .from("partners")
        .insert(partnerData)
        .select()
        .single();

      data = result.data;
      error = result.error;

      if (!error) {
        success = true;
        console.log(`Parceiro criado com sucesso na tentativa ${attempt}/${maxRetries}`);
        break;
      }

      // Se for erro de foreign key, aguardar e tentar novamente
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        if (attempt < maxRetries) {
          const delay = retryDelay * attempt; // Delay progressivo: 1s, 2s, 3s, 4s
          console.log(`Tentativa ${attempt}/${maxRetries}: Usuário ainda não disponível, aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Última tentativa falhou
          console.error("Usuário não encontrado após todas as tentativas:", user_id);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: "Usuário ainda não está disponível no sistema. Por favor, aguarde alguns segundos e tente novamente.",
              code: error.code,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Outros erros: não tentar novamente
      break;
    }

    if (!success && error) {
      console.error("Erro ao criar parceiro:", error);
      console.error("Detalhes do erro:", JSON.stringify(error, null, 2));

      // Erro de CNPJ duplicado
      if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Já existe um parceiro cadastrado com este CNPJ.",
            code: error.code,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message || "Erro ao criar registro de parceiro", 
          code: error.code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Parceiro criado com sucesso:", data?.id);
    
    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

