import { logger } from "./logger";

export interface CNPJData {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  data_inicio_atividade?: string;
  descricao_tipo_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  ddd_telefone_1?: string;
  email?: string;
}

/**
 * Remove formatação do CNPJ, deixando apenas números
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/**
 * Valida se o CNPJ tem 14 dígitos
 */
export function isValidCNPJLength(cnpj: string): boolean {
  const cleaned = cleanCNPJ(cnpj);
  return cleaned.length === 14;
}

/**
 * Busca dados completos de uma empresa pelo CNPJ usando BrasilAPI
 */
export async function fetchCNPJData(cnpj: string): Promise<CNPJData | null> {
  try {
    const cleanedCNPJ = cleanCNPJ(cnpj);
    
    if (cleanedCNPJ.length !== 14) {
      throw new Error("CNPJ deve ter 14 dígitos");
    }

    logger.db(`Buscando dados do CNPJ: ${cleanedCNPJ}`);

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCNPJ}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("CNPJ não encontrado");
      }
      if (response.status === 400) {
        throw new Error("CNPJ inválido");
      }
      throw new Error(`Erro ao buscar CNPJ: ${response.statusText}`);
    }

    const data = await response.json();
    
    logger.db(`Dados do CNPJ recebidos: ${data.razao_social || "N/A"}`);

    return {
      razao_social: data.razao_social || "",
      nome_fantasia: data.nome_fantasia || "",
      cnpj: data.cnpj || cleanedCNPJ,
      data_inicio_atividade: data.data_inicio_atividade,
      descricao_tipo_logradouro: data.descricao_tipo_logradouro || "",
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      cep: data.cep || "",
      uf: data.uf || "",
      municipio: data.municipio || "",
      ddd_telefone_1: data.ddd_telefone_1 || "",
      email: data.email || "",
    };
  } catch (error: any) {
    logger.error("Erro ao buscar dados do CNPJ:", error);
    throw error;
  }
}

/**
 * Formata endereço completo a partir dos dados do CNPJ
 */
export function formatEndereco(data: CNPJData): string {
  const parts: string[] = [];
  
  if (data.descricao_tipo_logradouro) {
    parts.push(data.descricao_tipo_logradouro);
  }
  
  if (data.logradouro) {
    parts.push(data.logradouro);
  }
  
  if (data.numero) {
    parts.push(data.numero);
  }
  
  if (data.complemento) {
    parts.push(data.complemento);
  }
  
  if (data.bairro) {
    parts.push(data.bairro);
  }
  
  return parts.join(", ");
}

/**
 * Formata CEP para exibição (00000-000)
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
  }
  return cep;
}

/**
 * Formata CNPJ para exibição (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanCNPJ(cnpj);
  if (cleaned.length === 14) {
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}/${cleaned.substring(8, 12)}-${cleaned.substring(12)}`;
  }
  return cnpj;
}

