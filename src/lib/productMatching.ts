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
 * Calcula similaridade entre 0 e 1
 */
function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
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
  score: number;
  matchType: "exact" | "fuzzy" | "code" | "reference";
}

/**
 * Encontra produtos correspondentes usando múltiplas estratégias
 */
export async function findProductMatches(
  itemName: string,
  itemReference?: string,
  products: any[] = []
): Promise<ProductMatch[]> {
  if (!itemName || products.length === 0) {
    return [];
  }

  const normalizedItemName = normalize(itemName);
  const matches: ProductMatch[] = [];

  for (const product of products) {
    const productName = normalize(product.nome || "");
    const productCode = normalize(product.codigo || "");
    const productSku = normalize(product.sku_interno || "");
    const normalizedRef = itemReference ? normalize(itemReference) : "";

    let score = 0;
    let matchType: ProductMatch["matchType"] = "fuzzy";

    // 1. Match exato por nome
    if (productName === normalizedItemName) {
      score = 1.0;
      matchType = "exact";
    }
    // 2. Match por código/referência ou part_number
    const productPartNumber = normalize(product.codigo_fabricante || "");
    if (
      normalizedRef &&
      (productCode === normalizedRef ||
        productSku === normalizedRef ||
        productPartNumber === normalizedRef)
    ) {
      score = 0.95;
      matchType = "code";
    }
    // 3. Match por referência no nome do produto
    else if (
      normalizedRef &&
      (productName.includes(normalizedRef) || normalizedRef.includes(productCode))
    ) {
      score = 0.85;
      matchType = "reference";
    }
    // 4. Fuzzy match por similaridade
    else {
      const nameSimilarity = similarity(normalizedItemName, productName);
      const codeSimilarity = normalizedRef
        ? Math.max(
            similarity(normalizedRef, productCode),
            similarity(normalizedRef, productSku)
          )
        : 0;

      score = Math.max(nameSimilarity, codeSimilarity * 0.7);
      matchType = "fuzzy";
    }

    // Só adicionar se score for razoável (>= 0.5)
    if (score >= 0.5) {
      matches.push({
        product,
        score,
        matchType,
      });
    }
  }

  // Ordenar por score (maior primeiro)
  matches.sort((a, b) => b.score - a.score);

  // Retornar top 5 matches
  return matches.slice(0, 5);
}

/**
 * Encontra o melhor match para um item
 */
export async function findBestProductMatch(
  itemName: string,
  itemReference?: string,
  products: any[] = []
): Promise<ProductMatch | null> {
  const matches = await findProductMatches(itemName, itemReference, products);
  return matches.length > 0 && matches[0].score >= 0.7 ? matches[0] : null;
}

/**
 * Encontra todos os matches com score >= threshold
 */
export async function findAllProductMatches(
  itemName: string,
  itemReference?: string,
  products: any[] = [],
  threshold: number = 0.5
): Promise<ProductMatch[]> {
  const matches = await findProductMatches(itemName, itemReference, products);
  return matches.filter((m) => m.score >= threshold);
}

