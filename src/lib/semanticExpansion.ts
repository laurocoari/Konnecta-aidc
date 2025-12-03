/**
 * Expansão semântica de nomes de produtos usando IA
 * Transforma nomes curtos (ex: "ct48") em variações semânticas completas
 */

/**
 * Identifica se o texto contém um código de produto (ex: ct48, zt231)
 */
export function identifyProductCode(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  
  // Regex para códigos comuns: ct48, zt231, zd220, etc
  const codePattern = /([a-z]{1,3}[\d]{2,6}(?:[-][a-z0-9]+)?)/i;
  const match = normalized.match(codePattern);
  
  return match ? match[1] : null;
}

/**
 * Normaliza texto para comparação
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove pontuação
    .trim();
}

/**
 * Separa tokens do texto
 */
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Identifica se é um acessório (bateria, cabo, carregador, etc)
 */
export function isAccessory(text: string): boolean {
  const normalized = normalizeText(text);
  const accessoryKeywords = [
    'bateria', 'battery',
    'carregador', 'charger',
    'cabo', 'cable',
    'fonte', 'power supply',
    'cradle', 'dock',
    'suporte', 'mount',
    'antena', 'antenna',
    'case', 'case',
    'pelicula', 'screen protector'
  ];
  
  return accessoryKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Extrai marca do texto
 */
export function extractBrand(text: string): string | null {
  const normalized = normalizeText(text);
  const brands = [
    'urovo', 'zebra', 'honeywell', 'datalogic', 
    'intermec', 'symbol', 'motorola', 'datalogic',
    'unitech', 'bluebird', 'casio', 'panasonic'
  ];
  
  for (const brand of brands) {
    if (normalized.includes(brand)) {
      return brand;
    }
  }
  
  return null;
}

/**
 * Gera sinônimos semânticos usando regras e padrões conhecidos
 * TODO: Integrar com MCP Context7 para expansão mais inteligente
 */
export async function generateSemanticSynonyms(
  productName: string,
  partNumber?: string
): Promise<string[]> {
  const synonyms: string[] = [];
  const normalized = normalizeText(productName);
  const code = identifyProductCode(productName);
  const brand = extractBrand(productName);
  
  // Se identificou um código, gerar variações
  if (code) {
    const codeVariations = [
      code,
      code.replace(/-/g, ''),
      code.replace(/-/g, ' '),
      code.toUpperCase(),
      code.toLowerCase(),
      code.replace(/([a-z])(\d)/i, '$1 $2'), // ct48 -> ct 48
      code.replace(/(\d)([a-z])/i, '$1 $2'), // 48a -> 48 a
    ];
    
    // Adicionar variações com marca
    if (brand) {
      codeVariations.forEach(cv => {
        synonyms.push(`${brand} ${cv}`);
        synonyms.push(`${cv} ${brand}`);
        synonyms.push(`${brand} ${cv.toUpperCase()}`);
        synonyms.push(`${brand.toUpperCase()} ${cv}`);
      });
    }
    
    // Adicionar variações com termos comuns de dispositivos móveis
    const commonTerms = [
      'dispositivo móvel',
      'dispositivo movel',
      'mobile computer',
      'coletor',
      'scanner',
      'handheld',
      'terminal móvel',
      'terminal movel',
      'data collector',
      'pda'
    ];
    
    codeVariations.forEach(cv => {
      commonTerms.forEach(term => {
        synonyms.push(`${term} ${cv}`);
        synonyms.push(`${cv} ${term}`);
        if (brand) {
          synonyms.push(`${brand} ${term} ${cv}`);
        }
      });
    });
    
    synonyms.push(...codeVariations);
  }
  
  // Se for acessório, adicionar variações
  if (isAccessory(productName)) {
    const accessoryTerms = [
      'bateria', 'battery',
      'carregador', 'charger',
      'cabo', 'cable',
      'fonte', 'power supply',
      'cradle', 'dock',
      'suporte', 'mount'
    ];
    
    accessoryTerms.forEach(term => {
      if (normalized.includes(term)) {
        if (code) {
          synonyms.push(`${term} para ${code}`);
          synonyms.push(`${term} ${code}`);
          synonyms.push(`${term} do ${code}`);
          if (brand) {
            synonyms.push(`${brand} ${term} ${code}`);
            synonyms.push(`${term} ${brand} ${code}`);
          }
        }
        // Variações do termo de acessório
        synonyms.push(term);
        if (term.includes(' ')) {
          synonyms.push(term.replace(' ', '-'));
        }
      }
    });
  }
  
  // Adicionar o nome original e normalizado
  synonyms.push(productName);
  synonyms.push(normalized);
  
  // Se houver part number, adicionar variações
  if (partNumber) {
    const partNormalized = normalizeText(partNumber);
    synonyms.push(partNormalized);
    synonyms.push(partNumber);
    if (code && partNormalized !== code) {
      synonyms.push(`${code} ${partNormalized}`);
    }
  }
  
  // Remover duplicatas e retornar
  return Array.from(new Set(synonyms));
}

/**
 * Expande o nome do item da cotação antes da comparação
 */
export async function expandItemName(
  itemName: string,
  partNumber?: string
): Promise<{
  normalized: string;
  code: string | null;
  brand: string | null;
  isAccessory: boolean;
  synonyms: string[];
}> {
  const normalized = normalizeText(itemName);
  const code = identifyProductCode(itemName);
  const brand = extractBrand(itemName);
  const accessory = isAccessory(itemName);
  const synonyms = await generateSemanticSynonyms(itemName, partNumber);
  
  return {
    normalized,
    code,
    brand,
    isAccessory: accessory,
    synonyms
  };
}

