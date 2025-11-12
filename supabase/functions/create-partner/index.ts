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
    // No Supabase Edge Functions, as variáveis de ambiente são diferentes
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || 
                       Deno.env.get("SUPABASE_SERVICE_URL") || 
                       "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
                              Deno.env.get("SUPABASE_ANON_KEY") || 
                              "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Variáveis de ambiente não configuradas:", {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
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

    const { user_id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado } =
      await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "user_id e email são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Inserir registro de parceiro
    const { data, error } = await supabaseAdmin
      .from("partners")
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar parceiro:", error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

