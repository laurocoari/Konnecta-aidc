/**
 * Função de similaridade simples (Levenshtein simplificado)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calcula similaridade entre 0 e 1 usando Levenshtein
 */
function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Token Similarity - compara palavras individuais
 */
function tokenSimilarity(str1: string, str2: string): number {
  const tokens1 = normalize(str1).split(/\s+/).filter(t => t.length > 0);
  const tokens2 = normalize(str2).split(/\s+/).filter(t => t.length > 0);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  let matches = 0;
  for (const token1 of tokens1) {
    for (const token2 of tokens2) {
      if (token1 === token2 || token1.includes(token2) || token2.includes(token1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(tokens1.length, tokens2.length);
}

/**
 * Partial Ratio - verifica se uma string contém a outra
 */
function partialRatio(str1: string, str2: string): number {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return minLen / maxLen;
  }
  return 0;
}

/**
 * Token Sort Ratio - ordena tokens e compara
 */
function tokenSortRatio(str1: string, str2: string): number {
  const tokens1 = normalize(str1).split(/\s+/).sort().join(" ");
  const tokens2 = normalize(str2).split(/\s+/).sort().join(" ");
  return similarity(tokens1, tokens2);
}

/**
 * Fuzzy Ratio combinado (média de múltiplas métricas)
 */
function fuzzyRatio(str1: string, str2: string): number {
  const sim = similarity(str1, str2);
  const tokenSim = tokenSimilarity(str1, str2);
  const partial = partialRatio(str1, str2);
  const tokenSort = tokenSortRatio(str1, str2);
  
  // Média ponderada
  return (sim * 0.3 + tokenSim * 0.3 + partial * 0.2 + tokenSort * 0.2);
}

/**
 * Normaliza string para comparação
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
    .trim();
}

export interface ProductMatch {
  product: any;
  score: number; // 0-100
  matchType: "exact" | "fuzzy" | "code" | "reference" | "part_number" | "brand" | "ncm";
  matchDetails: {
    partNumberScore: number;
    textScore: number;
    brandScore: number;
    ncmScore: number;
    explanation: string;
  };
}

/**
 * Extrai marca do texto (ZEBRA, UROVO, HONEYWELL, etc)
 */
function extractBrand(text: string): string {
  const brands = ["zebra", "urovo", "honeywell", "datalogic", "intermec", "symbol", "motorola"];
  const normalized = normalize(text);
  for (const brand of brands) {
    if (normalized.includes(brand)) {
      return brand;
    }
  }
  return "";
}

/**
 * Encontra produtos correspondentes usando sistema híbrido de similaridade
 * NOVOS PESOS: Part Number 40%, Token Similarity 25%, Semântica 25%, Marca 5%, NCM 5%
 */
export async function findProductMatches(
  itemName: string,
  itemPartNumber?: string,
  itemNcm?: string,
  products: any[] = [],
  expandedSynonyms?: string[]
): Promise<ProductMatch[]> {
  if (!itemName || products.length === 0) {
    return [];
  }

  const normalizedItemName = normalize(itemName);
  const normalizedPartNumber = itemPartNumber ? normalize(itemPartNumber) : "";
  const normalizedNcm = itemNcm ? normalize(itemNcm) : "";
  const itemBrand = extractBrand(itemName);
  
  // Usar sinônimos expandidos se fornecidos
  const synonymsToCheck = expandedSynonyms && expandedSynonyms.length > 0
    ? expandedSynonyms.map(s => normalize(s))
    : [normalizedItemName];
  
  const matches: ProductMatch[] = [];

  for (const product of products) {
    const productName = normalize(product.nome || "");
    const productDesc = normalize(product.descricao || "");
    const productPartNumber = normalize(product.codigo_fabricante || "");
    const productNcm = normalize(product.ncm || "");
    const productBrand = extractBrand(product.nome || product.descricao || "");

    // 1. Part Number Match (40% do peso)
    let partNumberScore = 0;
    let partNumberMatch = false;
    
    // Verificar match direto de part number
    if (normalizedPartNumber && productPartNumber) {
      if (productPartNumber === normalizedPartNumber) {
        partNumberScore = 100; // Match exato
        partNumberMatch = true;
      } else if (productPartNumber.includes(normalizedPartNumber) || normalizedPartNumber.includes(productPartNumber)) {
        partNumberScore = 85; // Match parcial
        partNumberMatch = true;
      } else {
        // Fuzzy match de part number
        partNumberScore = fuzzyRatio(normalizedPartNumber, productPartNumber) * 100;
        if (partNumberScore >= 70) {
          partNumberMatch = true;
        }
      }
    }
    
    // IMPORTANTE: Verificar se o código aparece no nome do produto também
    // Ex: part_number "ct48" deve dar match com produto "Dispositivo móvel CT48"
    if (normalizedPartNumber && normalizedPartNumber.length >= 2) {
      // Verificar match direto (já normalizado, então case-insensitive)
      const codeInName = productName.includes(normalizedPartNumber);
      const codeInDesc = productDesc ? productDesc.includes(normalizedPartNumber) : false;
      
      if (codeInName || codeInDesc) {
        // Código encontrado no nome/descrição = match forte
        partNumberScore = Math.max(partNumberScore, 90);
        partNumberMatch = true;
      } else {
        // Verificar variações do código (com/sem espaços, hífens, maiúsculas)
        const codeVariations = [
          normalizedPartNumber,
          normalizedPartNumber.replace(/-/g, ''),
          normalizedPartNumber.replace(/-/g, ' '),
          normalizedPartNumber.toUpperCase(),
          normalizedPartNumber.replace(/([a-z])(\d)/i, '$1 $2'), // ct48 -> ct 48
          normalizedPartNumber.replace(/(\d)([a-z])/i, '$1 $2'), // 48a -> 48 a
        ];
        
        for (const variation of codeVariations) {
          // Buscar case-insensitive no nome e descrição
          const nameLower = productName.toLowerCase();
          const descLower = productDesc ? productDesc.toLowerCase() : '';
          const variationLower = variation.toLowerCase();
          
          if (nameLower.includes(variationLower) || descLower.includes(variationLower)) {
            partNumberScore = Math.max(partNumberScore, 85);
            partNumberMatch = true;
            break;
          }
        }
      }
    }

    // 2. Token Similarity (25% do peso)
    const tokenSim = tokenSimilarity(normalizedItemName, productName);
    const tokenSimDesc = productDesc ? tokenSimilarity(normalizedItemName, productDesc) : 0;
    const tokenScore = Math.max(tokenSim, tokenSimDesc) * 100;

    // 3. Semantic Similarity usando sinônimos expandidos (25% do peso)
    let semanticScore = 0;
    if (synonymsToCheck.length > 0) {
      let maxSemanticMatch = 0;
      for (const synonym of synonymsToCheck) {
        const nameMatch = fuzzyRatio(synonym, productName);
        const descMatch = productDesc ? fuzzyRatio(synonym, productDesc) : 0;
        maxSemanticMatch = Math.max(maxSemanticMatch, nameMatch, descMatch);
      }
      semanticScore = maxSemanticMatch * 100;
    } else {
      // Fallback para fuzzy ratio normal se não houver sinônimos
      const nameSimilarity = fuzzyRatio(normalizedItemName, productName);
      const descSimilarity = productDesc ? fuzzyRatio(normalizedItemName, productDesc) : 0;
      semanticScore = Math.max(nameSimilarity, descSimilarity) * 100;
    }

    // 4. Brand Match (5% do peso)
    let brandScore = 0;
    if (itemBrand && productBrand && itemBrand === productBrand) {
      brandScore = 100;
    } else if (itemBrand || productBrand) {
      // Penalizar se uma tem marca e outra não
      brandScore = 0;
    } else {
      // Nenhuma tem marca identificada, não penalizar
      brandScore = 50;
    }

    // 5. NCM Match (5% do peso)
    let ncmScore = 0;
    if (normalizedNcm && productNcm) {
      if (productNcm === normalizedNcm) {
        ncmScore = 100;
      } else if (productNcm.startsWith(normalizedNcm.substring(0, 4)) || normalizedNcm.startsWith(productNcm.substring(0, 4))) {
        ncmScore = 70; // Mesmo capítulo NCM
      }
    } else {
      ncmScore = 50; // Nenhum tem NCM, não penalizar
    }

    // Cálculo do score final com NOVOS PESOS
    const finalScore = 
      (partNumberScore * 0.40) +
      (tokenScore * 0.25) +
      (semanticScore * 0.25) +
      (brandScore * 0.05) +
      (ncmScore * 0.05);

    // Determinar tipo de match
    let matchType: ProductMatch["matchType"] = "fuzzy";
    if (partNumberMatch) {
      matchType = "part_number";
    } else if (semanticScore >= 90) {
      matchType = "exact";
    } else if (brandScore === 100) {
      matchType = "brand";
    } else if (ncmScore === 100) {
      matchType = "ncm";
    }

    // Gerar explicação
    const explanations: string[] = [];
    if (partNumberScore >= 80) {
      explanations.push(`Part Number: ${Math.round(partNumberScore)}%`);
    }
    if (tokenScore >= 70) {
      explanations.push(`Token similarity: ${Math.round(tokenScore)}%`);
    }
    if (semanticScore >= 70) {
      explanations.push(`Semântica: ${Math.round(semanticScore)}%`);
    }
    if (brandScore === 100) {
      explanations.push(`Marca: ${itemBrand.toUpperCase()}`);
    }
    if (ncmScore >= 70) {
      explanations.push(`NCM correspondente`);
    }
    
    const explanation = explanations.length > 0 
      ? explanations.join(", ")
      : "Similaridade baseada em múltiplos fatores";

    // Adicionar TODOS os resultados, mesmo abaixo de 10%
    // O filtro será feito no componente
    matches.push({
      product,
      score: Math.round(finalScore),
      matchType,
      matchDetails: {
        partNumberScore: Math.round(partNumberScore),
        textScore: Math.round(semanticScore), // Usando semanticScore como textScore
        brandScore: Math.round(brandScore),
        ncmScore: Math.round(ncmScore),
        explanation,
      },
    });
  }

  // Ordenar por score (maior primeiro)
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Encontra o melhor match para um item
 */
export async function findBestProductMatch(
  itemName: string,
  itemPartNumber?: string,
  itemNcm?: string,
  products: any[] = []
): Promise<ProductMatch | null> {
  const matches = await findProductMatches(itemName, itemPartNumber, itemNcm, products);
  return matches.length > 0 && matches[0].score >= 70 ? matches[0] : null;
}

/**
 * Encontra todos os matches com score >= threshold
 */
export async function findAllProductMatches(
  itemName: string,
  itemPartNumber?: string,
  itemNcm?: string,
  products: any[] = [],
  threshold: number = 10,
  expandedSynonyms?: string[]
): Promise<ProductMatch[]> {
  const matches = await findProductMatches(itemName, itemPartNumber, itemNcm, products, expandedSynonyms);
  return matches.filter((m) => m.score >= threshold);
}

