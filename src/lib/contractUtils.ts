import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

/**
 * Gera um número único de contrato no formato CTR-YYYY-XXX
 * onde YYYY é o ano atual e XXX é um número sequencial
 */
export async function generateContractNumber(): Promise<string> {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `CTR-${currentYear}-`;

    // Buscar o último número do ano atual
    const { data, error } = await supabase
      .from("contracts")
      .select("numero")
      .like("numero", `${prefix}%`)
      .order("numero", { ascending: false })
      .limit(1);

    if (error) {
      logger.error("CONTRACT", "Erro ao buscar último número de contrato", error);
      throw error;
    }

    let nextNumber = 1;

    if (data && data.length > 0) {
      // Extrair o número sequencial do último contrato
      const lastNumber = data[0].numero;
      const match = lastNumber.match(new RegExp(`${prefix}(\\d+)`));
      
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Formatar com 3 dígitos (001, 002, etc)
    const formattedNumber = nextNumber.toString().padStart(3, "0");
    const contractNumber = `${prefix}${formattedNumber}`;

    logger.db(`Número de contrato gerado: ${contractNumber}`);
    return contractNumber;
  } catch (error: any) {
    logger.error("CONTRACT", "Erro ao gerar número de contrato", error);
    throw error;
  }
}

