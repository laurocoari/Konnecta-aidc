/**
 * Busca de produtos no Supabase usando MCP
 * Implementa busca manual com LIKE e fuzzy matching
 */

import { supabase } from "@/integrations/supabase/client";

export interface ProductSearchResult {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string;
  codigo_fabricante: string | null;
  ncm: string | null;
  categoria: string;
  brand_id: string | null;
}

/**
 * Busca produtos no Supabase usando múltiplos critérios
 */
export async function searchProductsInSupabase(
  searchTerm: string
): Promise<ProductSearchResult[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const term = searchTerm.toLowerCase().trim();
  
  // Extrair código do termo (ex: "ct48" de "coletores UROVO CT48")
  const codeMatch = term.match(/([a-z]{1,3}[\d]{2,6}(?:[-][a-z0-9]+)?)/i);
  const code = codeMatch ? codeMatch[1].toLowerCase() : null;
  
  // Extrair números simples do termo (ex: "48" de "48" ou "ct48")
  const numberMatch = term.match(/(\d+)/);
  const number = numberMatch ? numberMatch[1] : null;
  
  // Gerar termos de busca (termo completo + código se identificado + número se identificado)
  const searchTerms = new Set([term]);
  if (code && code !== term) {
    searchTerms.add(code);
    searchTerms.add(code.replace(/-/g, ''));
    searchTerms.add(code.replace(/-/g, ' '));
  }
  // Se há um número simples, adicionar variações para busca parcial
  if (number && number !== term) {
    searchTerms.add(number);
  }
  
  try {
    // Busca usando LIKE em múltiplos campos
    // Nota: Supabase não suporta OR direto, então fazemos múltiplas queries
    const queries: any[] = [];
    
    // Para cada termo de busca, criar queries
    for (const st of Array.from(searchTerms)) {
      queries.push(
        // Busca por nome
        supabase
          .from("products")
          .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
          .ilike("nome", `%${st}%`)
          .eq("status", "ativo")
          .limit(50),
        
        // Busca por descrição
        supabase
          .from("products")
          .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
          .ilike("descricao", `%${st}%`)
          .eq("status", "ativo")
          .limit(50),
        
        // Busca por código
        supabase
          .from("products")
          .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
          .ilike("codigo", `%${st}%`)
          .eq("status", "ativo")
          .limit(50),
        
        // Busca por código fabricante (part number)
        supabase
          .from("products")
          .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
          .ilike("codigo_fabricante", `%${st}%`)
          .eq("status", "ativo")
          .limit(50)
      );
      
      // Se o termo é um número simples, fazer busca adicional por números em códigos
      // Isso garante que "48" encontre "CT48", "RT40", etc.
      if (/^\d+$/.test(st)) {
        queries.push(
          // Busca por número em código (ex: "48" em "CT48")
          supabase
            .from("products")
            .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
            .ilike("codigo", `%${st}%`)
            .eq("status", "ativo")
            .limit(50),
          
          // Busca por número em código_fabricante
          supabase
            .from("products")
            .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
            .ilike("codigo_fabricante", `%${st}%`)
            .eq("status", "ativo")
            .limit(50)
        );
      }
    }

    const results = await Promise.all(queries);
    
    // Combinar resultados e remover duplicatas
    const allProducts = new Map<string, ProductSearchResult>();
    
    results.forEach(({ data, error }) => {
      if (error) {
        console.error("Erro na busca Supabase:", error);
        return;
      }
      
      if (data) {
        data.forEach((product: any) => {
          if (!allProducts.has(product.id)) {
            allProducts.set(product.id, {
              id: product.id,
              nome: product.nome,
              descricao: product.descricao,
              codigo: product.codigo,
              codigo_fabricante: product.codigo_fabricante,
              ncm: product.ncm,
              categoria: product.categoria,
              brand_id: product.brand_id,
            });
          }
        });
      }
    });
    
    return Array.from(allProducts.values());
  } catch (error) {
    console.error("Erro ao buscar produtos no Supabase:", error);
    return [];
  }
}

/**
 * Busca produtos relacionados a um código específico
 * Útil para acessórios (ex: bateria para CT48)
 */
export async function searchProductsByCode(
  code: string
): Promise<ProductSearchResult[]> {
  if (!code) return [];
  
  const normalizedCode = code.toLowerCase().trim();
  const variations = [
    normalizedCode,
    normalizedCode.replace(/-/g, ''),
    normalizedCode.replace(/-/g, ' '),
    normalizedCode.toUpperCase(),
  ];
  
  const allProducts = new Map<string, ProductSearchResult>();
  
  for (const variation of variations) {
    const results = await searchProductsInSupabase(variation);
    results.forEach(product => {
      if (!allProducts.has(product.id)) {
        allProducts.set(product.id, product);
      }
    });
  }
  
  return Array.from(allProducts.values());
}

