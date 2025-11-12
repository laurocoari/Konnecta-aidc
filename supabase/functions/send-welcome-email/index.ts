import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(data: EmailData) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY não configurada. Email não será enviado.");
    return { success: false, error: "RESEND_API_KEY não configurada" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Konnecta <noreply@konnecta.com.br>",
        to: data.to,
        subject: data.subject,
        html: data.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erro ao enviar email:", error);
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return { success: false, error: String(error) };
  }
}

function generateAdminWelcomeEmail(fullName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Konnecta CRM</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Bem-vindo ao Konnecta CRM</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Olá, <strong>${fullName}</strong>!</p>
    
    <p>É com grande prazer que damos as boas-vindas ao <strong>Konnecta CRM</strong>, nosso sistema de gestão comercial.</p>
    
    <p>Como <strong>Administrador</strong>, você tem acesso completo a todas as funcionalidades do sistema:</p>
    
    <ul style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <li>Gestão completa de clientes e oportunidades</li>
      <li>Criação e gerenciamento de propostas comerciais</li>
      <li>Controle de produtos, marcas e fornecedores</li>
      <li>Análise financeira e relatórios</li>
      <li>Aprovação e gestão de parceiros</li>
    </ul>
    
    <p>Para começar, acesse o sistema através do link abaixo:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${Deno.env.get("APP_URL") || "https://app.konnecta.com.br"}/auth" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Acessar Sistema
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Se você tiver alguma dúvida ou precisar de suporte, não hesite em entrar em contato conosco.
    </p>
    
    <p style="font-size: 14px; color: #666;">
      Atenciosamente,<br>
      <strong>Equipe Konnecta</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>Este é um email automático, por favor não responda.</p>
    <p>&copy; ${new Date().getFullYear()} Konnecta. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `;
}

function generatePartnerWelcomeEmail(partnerName: string, empresa: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo como Parceiro Konnecta</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Parabéns! Você é agora um Parceiro Konnecta</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Olá, <strong>${partnerName}</strong>!</p>
    
    <p>É com grande satisfação que informamos que seu cadastro como <strong>Parceiro Konnecta</strong> foi <strong>aprovado</strong>!</p>
    
    <p>A empresa <strong>${empresa}</strong> agora faz parte da nossa rede de revendedores autorizados.</p>
    
    <p>Como parceiro, você tem acesso a:</p>
    
    <ul style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <li>Catálogo completo de produtos sem preços</li>
      <li>Registro de oportunidades de negócio</li>
      <li>Criação de propostas comerciais</li>
      <li>Acompanhamento de status de propostas</li>
      <li>Suporte dedicado da equipe Konnecta</li>
    </ul>
    
    <p>Para começar a usar o sistema, acesse o portal do parceiro:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${Deno.env.get("APP_URL") || "https://app.konnecta.com.br"}/auth/parceiro" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Acessar Portal do Parceiro
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Estamos à disposição para ajudar você a alcançar o sucesso em suas vendas!
    </p>
    
    <p style="font-size: 14px; color: #666;">
      Atenciosamente,<br>
      <strong>Equipe Konnecta</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>Este é um email automático, por favor não responda.</p>
    <p>&copy; ${new Date().getFullYear()} Konnecta. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `;
}

function generatePartnerRejectionEmail(partnerName: string, empresa: string, motivo: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status do Cadastro - Konnecta</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc2626; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Status do Cadastro</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Olá, <strong>${partnerName}</strong>!</p>
    
    <p>Infelizmente, após análise do seu cadastro, não foi possível aprovar sua solicitação para se tornar um <strong>Parceiro Konnecta</strong>.</p>
    
    <p><strong>Empresa:</strong> ${empresa}</p>
    
    <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; font-weight: bold; color: #991b1b;">Motivo da Rejeição:</p>
      <p style="margin: 5px 0 0 0; color: #7f1d1d;">${motivo}</p>
    </div>
    
    <p>Se você acredita que houve um engano ou deseja mais informações sobre o motivo da rejeição, entre em contato conosco através dos nossos canais de atendimento.</p>
    
    <p style="font-size: 14px; color: #666;">
      Atenciosamente,<br>
      <strong>Equipe Konnecta</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>Este é um email automático, por favor não responda.</p>
    <p>&copy; ${new Date().getFullYear()} Konnecta. Todos os direitos reservados.</p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  try {
    const { type, email, fullName, partnerName, empresa, motivo } = await req.json();

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: "Email e tipo são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let html = "";
    let subject = "";

    switch (type) {
      case "admin_welcome":
        if (!fullName) {
          return new Response(
            JSON.stringify({ error: "fullName é obrigatório para admin_welcome" }),
            { status: 400 }
          );
        }
        html = generateAdminWelcomeEmail(fullName);
        subject = "Bem-vindo ao Konnecta CRM - Sistema Administrativo";
        break;

      case "partner_welcome":
        if (!partnerName || !empresa) {
          return new Response(
            JSON.stringify({ error: "partnerName e empresa são obrigatórios para partner_welcome" }),
            { status: 400 }
          );
        }
        html = generatePartnerWelcomeEmail(partnerName, empresa);
        subject = "Parabéns! Você é agora um Parceiro Konnecta";
        break;

      case "partner_rejection":
        if (!partnerName || !empresa || !motivo) {
          return new Response(
            JSON.stringify({ error: "partnerName, empresa e motivo são obrigatórios para partner_rejection" }),
            { status: 400 }
          );
        }
        html = generatePartnerRejectionEmail(partnerName, empresa, motivo);
        subject = "Status do Cadastro - Konnecta";
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Tipo de email inválido" }),
          { status: 400 }
        );
    }

    const result = await sendEmail({ to: email, subject, html });

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

