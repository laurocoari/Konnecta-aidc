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
  const appUrl = Deno.env.get("APP_URL") || "https://app.konnecta.com.br";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo como Parceiro Konnecta</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5; margin: 0; padding: 0;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                🎉 Parabéns! Você é agora um Parceiro Konnecta
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; margin: 0 0 20px 0; font-weight: 600;">
                Olá, <strong style="color: #667eea;">${partnerName}</strong>!
              </p>
              
              <p style="font-size: 16px; color: #555555; margin: 0 0 20px 0; line-height: 1.8;">
                É com imensa alegria e satisfação que recebemos você como nosso mais novo <strong style="color: #667eea;">Parceiro Konnecta</strong>!
              </p>
              
              <p style="font-size: 16px; color: #555555; margin: 0 0 20px 0; line-height: 1.8;">
                Após análise criteriosa, temos o prazer de informar que o cadastro da empresa <strong style="color: #333333;">${empresa}</strong> foi <strong style="color: #10b981;">aprovado</strong> e agora você faz parte oficialmente da nossa rede de revendedores autorizados.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%); border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; font-weight: 600;">
                  🚀 Como Parceiro Konnecta, você tem acesso exclusivo a:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 15px; line-height: 2;">
                  <li style="margin-bottom: 10px;"><strong>Catálogo completo de produtos</strong> com especificações técnicas detalhadas</li>
                  <li style="margin-bottom: 10px;"><strong>Registro e gestão de oportunidades</strong> de negócio em tempo real</li>
                  <li style="margin-bottom: 10px;"><strong>Criação de propostas comerciais</strong> profissionais e personalizadas</li>
                  <li style="margin-bottom: 10px;"><strong>Acompanhamento completo</strong> do status de suas propostas</li>
                  <li style="margin-bottom: 10px;"><strong>Suporte dedicado</strong> da equipe comercial Konnecta</li>
                  <li style="margin-bottom: 0;"><strong>Ferramentas avançadas</strong> para potencializar suas vendas</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; color: #555555; margin: 30px 0 20px 0; line-height: 1.8;">
                Estamos comprometidos em oferecer todo o suporte necessário para que você alcance resultados excepcionais. Nossa parceria é baseada em confiança, transparência e crescimento mútuo.
              </p>
              
              <p style="font-size: 16px; color: #555555; margin: 0 0 30px 0; line-height: 1.8;">
                Para começar a explorar todas as funcionalidades e dar os primeiros passos rumo ao sucesso, acesse agora o Portal do Parceiro:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${appUrl}/auth/parceiro" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                  🎯 Acessar Portal do Parceiro
                </a>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; margin: 40px 0 20px 0; padding-top: 30px;">
                <p style="font-size: 15px; color: #666666; margin: 0 0 10px 0; line-height: 1.8;">
                  <strong style="color: #333333;">Próximos passos:</strong>
                </p>
                <ol style="margin: 0; padding-left: 20px; color: #666666; font-size: 15px; line-height: 2;">
                  <li>Acesse o portal com suas credenciais de cadastro</li>
                  <li>Explore o catálogo de produtos disponíveis</li>
                  <li>Registre suas primeiras oportunidades de negócio</li>
                  <li>Entre em contato conosco caso tenha dúvidas</li>
                </ol>
              </div>
              
              <p style="font-size: 15px; color: #666666; margin: 30px 0 0 0; line-height: 1.8;">
                Estamos muito entusiasmados em trabalhar ao seu lado e construir uma parceria de sucesso!
              </p>
              
              <p style="font-size: 15px; color: #666666; margin: 30px 0 0 0; line-height: 1.8;">
                Seja muito bem-vindo à família Konnecta! 🎊
              </p>
              
              <p style="font-size: 15px; color: #333333; margin: 40px 0 0 0; line-height: 1.8;">
                Atenciosamente,<br>
                <strong style="color: #667eea; font-size: 16px;">Equipe Konnecta</strong><br>
                <span style="color: #999999; font-size: 14px;">Sua parceira em soluções tecnológicas</span>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0; line-height: 1.6;">
                Este é um email automático enviado pelo sistema Konnecta.<br>
                Por favor, não responda diretamente a este email.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Konnecta. Todos os direitos reservados.
              </p>
              <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">
                Se você não solicitou este cadastro, por favor ignore este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

